-- Daily Routines System Database Schema
-- Allows users to set up automated daily logging for variables

-- ============================================================================
-- DAILY ROUTINES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Routine Configuration
    routine_name TEXT NOT NULL, -- User-friendly name for the routine
    default_value TEXT NOT NULL, -- Default value to log daily
    default_unit TEXT, -- Unit for the default value
    notes TEXT, -- Default notes for auto-generated logs
    
    -- Scheduling
    time_of_day TIME, -- Preferred time for auto-logging (optional)
    is_active BOOLEAN DEFAULT true, -- Whether routine is currently active
    
    -- Override Settings
    allow_manual_override BOOLEAN DEFAULT true, -- Whether manual logs can override
    skip_weekends BOOLEAN DEFAULT false, -- Whether to skip weekends
    skip_holidays BOOLEAN DEFAULT false, -- Whether to skip holidays
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_auto_logged TIMESTAMP WITH TIME ZONE, -- Last time routine was executed
    
    -- Constraints
    UNIQUE(user_id, variable_id), -- One routine per user per variable
    CONSTRAINT daily_routines_default_value_check CHECK (default_value IS NOT NULL AND default_value != '')
);

-- ============================================================================
-- ROUTINE LOG TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS routine_log_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Log Details
    log_date DATE NOT NULL, -- Date the auto-log was created for
    auto_logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When auto-log was created
    was_overridden BOOLEAN DEFAULT false, -- Whether user manually changed this log
    overridden_at TIMESTAMP WITH TIME ZONE, -- When override happened
    
    -- Values
    auto_logged_value TEXT NOT NULL, -- Value that was auto-logged
    auto_logged_unit TEXT, -- Unit for auto-logged value
    final_value TEXT, -- Final value after potential override
    final_unit TEXT, -- Final unit after potential override
    
    UNIQUE(routine_id, log_date) -- One auto-log per routine per date
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Daily routines indexes
CREATE INDEX IF NOT EXISTS idx_daily_routines_user_id ON daily_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_routines_variable_id ON daily_routines(variable_id);
CREATE INDEX IF NOT EXISTS idx_daily_routines_is_active ON daily_routines(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_routines_time_of_day ON daily_routines(time_of_day);
CREATE INDEX IF NOT EXISTS idx_daily_routines_last_auto_logged ON daily_routines(last_auto_logged);

-- Routine log history indexes
CREATE INDEX IF NOT EXISTS idx_routine_log_history_routine_id ON routine_log_history(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_user_id ON routine_log_history(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_log_date ON routine_log_history(log_date);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_was_overridden ON routine_log_history(was_overridden);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

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

-- Routine log history policies
ALTER TABLE routine_log_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routine logs" ON routine_log_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert routine logs" ON routine_log_history
    FOR INSERT WITH CHECK (true); -- Allow system to insert

CREATE POLICY "Users can update their own routine logs" ON routine_log_history
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR ROUTINE MANAGEMENT
-- ============================================================================

-- Function to create auto-logs for active routines
CREATE OR REPLACE FUNCTION create_routine_auto_logs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(routine_id UUID, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) AS $$
DECLARE
    routine_record RECORD;
    log_exists BOOLEAN;
    manual_log_exists BOOLEAN;
    variable_record RECORD;
BEGIN
    -- Loop through all active routines
    FOR routine_record IN 
        SELECT dr.*, v.label as variable_name, v.slug as variable_slug
        FROM daily_routines dr
        JOIN variables v ON dr.variable_id = v.id
        WHERE dr.is_active = true
        AND (dr.last_auto_logged IS NULL OR dr.last_auto_logged::date < target_date)
        AND (NOT dr.skip_weekends OR EXTRACT(dow FROM target_date) NOT IN (0, 6))
    LOOP
        -- Check if auto-log already exists for this date
        SELECT EXISTS(
            SELECT 1 FROM routine_log_history 
            WHERE routine_id = routine_record.id 
            AND log_date = target_date
        ) INTO log_exists;
        
        -- Check if manual log exists for this variable/date
        SELECT EXISTS(
            SELECT 1 FROM variable_logs vl
            WHERE vl.user_id = routine_record.user_id 
            AND vl.variable_id = routine_record.variable_id
            AND vl.logged_at::date = target_date
            AND vl.source = 'manual'
        ) INTO manual_log_exists;
        
        -- If no auto-log exists and no manual override, create auto-log
        IF NOT log_exists AND NOT manual_log_exists THEN
            -- Insert into variable_logs
            INSERT INTO variable_logs (
                user_id, variable_id, display_value, display_unit, 
                logged_at, source, notes, confidence_score
            ) VALUES (
                routine_record.user_id,
                routine_record.variable_id,
                routine_record.default_value,
                routine_record.default_unit,
                target_date + COALESCE(routine_record.time_of_day, '08:00:00'::time),
                'routine',
                routine_record.notes,
                0.8 -- Lower confidence for auto-logged data
            );
            
            -- Insert into routine_log_history
            INSERT INTO routine_log_history (
                routine_id, user_id, variable_id, log_date,
                auto_logged_value, auto_logged_unit, final_value, final_unit
            ) VALUES (
                routine_record.id,
                routine_record.user_id,
                routine_record.variable_id,
                target_date,
                routine_record.default_value,
                routine_record.default_unit,
                routine_record.default_value,
                routine_record.default_unit
            );
            
            -- Update last auto-logged timestamp
            UPDATE daily_routines 
            SET last_auto_logged = NOW()
            WHERE id = routine_record.id;
            
            -- Return success
            routine_id := routine_record.id;
            variable_name := routine_record.variable_name;
            auto_logged := true;
            error_message := NULL;
            RETURN NEXT;
        ELSE
            -- Return skipped info
            routine_id := routine_record.id;
            variable_name := routine_record.variable_name;
            auto_logged := false;
            error_message := CASE 
                WHEN log_exists THEN 'Auto-log already exists'
                WHEN manual_log_exists THEN 'Manual log exists - skipped'
                ELSE 'Unknown reason'
            END;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle manual log overrides
CREATE OR REPLACE FUNCTION handle_routine_override(
    p_user_id UUID,
    p_variable_id UUID,
    p_log_date DATE
) RETURNS VOID AS $$
BEGIN
    -- Mark routine log as overridden if it exists
    UPDATE routine_log_history 
    SET was_overridden = true, 
        overridden_at = NOW()
    WHERE user_id = p_user_id 
    AND variable_id = p_variable_id 
    AND log_date = p_log_date
    AND was_overridden = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle manual log overrides automatically
CREATE OR REPLACE FUNCTION trigger_handle_routine_override()
RETURNS TRIGGER AS $$
BEGIN
    -- Only handle manual logs
    IF NEW.source = 'manual' THEN
        PERFORM handle_routine_override(
            NEW.user_id, 
            NEW.variable_id, 
            NEW.logged_at::date
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on variable_logs
DROP TRIGGER IF EXISTS routine_override_trigger ON variable_logs;
CREATE TRIGGER routine_override_trigger
    AFTER INSERT ON variable_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_handle_routine_override();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get user's active routines with variable info
CREATE OR REPLACE FUNCTION get_user_routines(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    routine_name TEXT,
    variable_name TEXT,
    variable_slug TEXT,
    default_value TEXT,
    default_unit TEXT,
    time_of_day TIME,
    is_active BOOLEAN,
    last_auto_logged TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.routine_name,
        v.label as variable_name,
        v.slug as variable_slug,
        dr.default_value,
        dr.default_unit,
        dr.time_of_day,
        dr.is_active,
        dr.last_auto_logged,
        dr.created_at
    FROM daily_routines dr
    JOIN variables v ON dr.variable_id = v.id
    WHERE dr.user_id = p_user_id
    ORDER BY dr.routine_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 