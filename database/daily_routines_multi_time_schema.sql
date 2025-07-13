-- Enhanced Daily Routines System Database Schema
-- Supports multiple times per routine with variable assignments to specific times

-- ============================================================================
-- DAILY ROUTINES TABLE (Enhanced)
-- ============================================================================

-- First, drop existing constraints and tables if updating
DROP TABLE IF EXISTS routine_log_history CASCADE;
DROP TABLE IF EXISTS routine_time_variables CASCADE;
DROP TABLE IF EXISTS routine_times CASCADE;
DROP TABLE IF EXISTS routine_variables CASCADE;
DROP TABLE IF EXISTS daily_routines CASCADE;

CREATE TABLE IF NOT EXISTS daily_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Routine Configuration
    routine_name TEXT NOT NULL, -- User-friendly name for the routine
    notes TEXT, -- Default notes for auto-generated logs
    
    -- Scheduling
    is_active BOOLEAN DEFAULT true, -- Whether routine is currently active
    
    -- Weekday Settings (replaces skip_weekends and skip_holidays)
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
-- ROUTINE LOG TRACKING (Enhanced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS routine_log_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
    routine_time_id UUID REFERENCES routine_times(id) ON DELETE CASCADE,
    routine_time_variable_id UUID REFERENCES routine_time_variables(id) ON DELETE CASCADE,
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
    
    UNIQUE(routine_time_variable_id, log_date) -- One auto-log per routine-time-variable per date
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Daily routines indexes
CREATE INDEX IF NOT EXISTS idx_daily_routines_user_id ON daily_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_routines_is_active ON daily_routines(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_routines_last_auto_logged ON daily_routines(last_auto_logged);
CREATE INDEX IF NOT EXISTS idx_daily_routines_weekdays ON daily_routines USING GIN(weekdays);

-- Routine times indexes
CREATE INDEX IF NOT EXISTS idx_routine_times_routine_id ON routine_times(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_times_time_of_day ON routine_times(time_of_day);
CREATE INDEX IF NOT EXISTS idx_routine_times_is_active ON routine_times(is_active);
CREATE INDEX IF NOT EXISTS idx_routine_times_display_order ON routine_times(display_order);

-- Routine time variables indexes
CREATE INDEX IF NOT EXISTS idx_routine_time_variables_routine_time_id ON routine_time_variables(routine_time_id);
CREATE INDEX IF NOT EXISTS idx_routine_time_variables_variable_id ON routine_time_variables(variable_id);
CREATE INDEX IF NOT EXISTS idx_routine_time_variables_display_order ON routine_time_variables(display_order);

-- Routine log history indexes
CREATE INDEX IF NOT EXISTS idx_routine_log_history_routine_id ON routine_log_history(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_routine_time_id ON routine_log_history(routine_time_id);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_routine_time_variable_id ON routine_log_history(routine_time_variable_id);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_user_id ON routine_log_history(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_variable_id ON routine_log_history(variable_id);
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

-- Routine times policies
ALTER TABLE routine_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routine times for their routines" ON routine_times
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can create routine times for their routines" ON routine_times
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine times for their routines" ON routine_times
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine times for their routines" ON routine_times
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

-- Routine time variables policies
ALTER TABLE routine_time_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routine time variables for their routines" ON routine_time_variables
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can create routine time variables for their routines" ON routine_time_variables
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can update routine time variables for their routines" ON routine_time_variables
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete routine time variables for their routines" ON routine_time_variables
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

-- Routine log history policies
ALTER TABLE routine_log_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routine logs" ON routine_log_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert routine logs" ON routine_log_history
    FOR INSERT WITH CHECK (true); -- Allow system to insert

CREATE POLICY "Users can update their own routine logs" ON routine_log_history
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR ROUTINE MANAGEMENT (Enhanced)
-- ============================================================================

-- Function to create auto-logs for active routines with multiple times and variables
CREATE OR REPLACE FUNCTION create_routine_auto_logs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(routine_id UUID, routine_name TEXT, time_name TEXT, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) AS $$
DECLARE
    routine_record RECORD;
    time_record RECORD;
    variable_record RECORD;
    log_exists BOOLEAN;
    manual_log_exists BOOLEAN;
    target_weekday INTEGER;
BEGIN
    -- Get the weekday for the target date (1=Monday, 7=Sunday)
    target_weekday := EXTRACT(dow FROM target_date);
    -- Convert to 1-7 format (PostgreSQL uses 0=Sunday, so we need to adjust)
    IF target_weekday = 0 THEN
        target_weekday := 7;
    END IF;
    
    -- Loop through all active routines
    FOR routine_record IN 
        SELECT dr.id, dr.routine_name, dr.user_id, dr.weekdays
        FROM daily_routines dr
        WHERE dr.is_active = true
        AND (dr.last_auto_logged IS NULL OR dr.last_auto_logged::date < target_date)
        AND target_weekday = ANY(dr.weekdays) -- Check if target date is in allowed weekdays
    LOOP
        -- Loop through all active times for this routine
        FOR time_record IN
            SELECT rt.id, rt.time_of_day, rt.time_name, rt.is_active
            FROM routine_times rt
            WHERE rt.routine_id = routine_record.id
            AND rt.is_active = true
            ORDER BY rt.display_order, rt.time_of_day
        LOOP
            -- Loop through all variables for this routine time
            FOR variable_record IN
                SELECT rtv.*, v.label as variable_name, v.slug as variable_slug
                FROM routine_time_variables rtv
                JOIN variables v ON rtv.variable_id = v.id
                WHERE rtv.routine_time_id = time_record.id
                ORDER BY rtv.display_order
            LOOP
                -- Check if auto-log already exists for this date and time-variable
                SELECT EXISTS(
                    SELECT 1 FROM routine_log_history 
                    WHERE routine_time_variable_id = variable_record.id 
                    AND log_date = target_date
                ) INTO log_exists;
                
                -- Check if manual log exists for this variable/date
                SELECT EXISTS(
                    SELECT 1 FROM variable_logs vl
                    WHERE vl.user_id = routine_record.user_id 
                    AND vl.variable_id = variable_record.variable_id
                    AND vl.logged_at::date = target_date
                    AND vl.source = 'manual'
                ) INTO manual_log_exists;
                
                -- If no auto-log exists and no manual override, create auto-log
                IF NOT log_exists AND NOT manual_log_exists THEN
                    -- Insert auto-log into variable_logs
                    INSERT INTO variable_logs (
                        user_id, 
                        variable_id, 
                        display_value, 
                        display_unit, 
                        source, 
                        logged_at,
                        notes
                    ) VALUES (
                        routine_record.user_id,
                        variable_record.variable_id,
                        variable_record.default_value,
                        variable_record.default_unit,
                        'routine',
                        target_date::timestamp + time_record.time_of_day,
                        routine_record.notes
                    );
                    
                    -- Record in routine log history
                    INSERT INTO routine_log_history (
                        routine_id,
                        routine_time_id,
                        routine_time_variable_id,
                        user_id,
                        variable_id,
                        log_date,
                        auto_logged_value,
                        auto_logged_unit,
                        final_value,
                        final_unit
                    ) VALUES (
                        routine_record.id,
                        time_record.id,
                        variable_record.id,
                        routine_record.user_id,
                        variable_record.variable_id,
                        target_date,
                        variable_record.default_value,
                        variable_record.default_unit,
                        variable_record.default_value,
                        variable_record.default_unit
                    );
                    
                    -- Return success
                    routine_id := routine_record.id;
                    routine_name := routine_record.routine_name;
                    time_name := COALESCE(time_record.time_name, time_record.time_of_day::text);
                    variable_name := variable_record.variable_name;
                    auto_logged := true;
                    error_message := NULL;
                    RETURN NEXT;
                ELSE
                    -- Return skipped info
                    routine_id := routine_record.id;
                    routine_name := routine_record.routine_name;
                    time_name := COALESCE(time_record.time_name, time_record.time_of_day::text);
                    variable_name := variable_record.variable_name;
                    auto_logged := false;
                    error_message := CASE 
                        WHEN log_exists THEN 'Auto-log already exists'
                        WHEN manual_log_exists THEN 'Manual log exists - skipped'
                        ELSE 'Unknown reason'
                    END;
                    RETURN NEXT;
                END IF;
            END LOOP;
        END LOOP;
        
        -- Update last auto-logged timestamp for the routine
        UPDATE daily_routines 
        SET last_auto_logged = NOW()
        WHERE id = routine_record.id;
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
-- UTILITY FUNCTIONS (Enhanced)
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

-- Function to create a new routine with times and variables
CREATE OR REPLACE FUNCTION create_routine(p_routine_data JSONB)
RETURNS UUID AS $$
DECLARE
    new_routine_id UUID;
    time_data JSONB;
    variable_data JSONB;
    new_time_id UUID;
BEGIN
    -- Insert the routine
    INSERT INTO daily_routines (
        user_id,
        routine_name,
        notes,
        weekdays
    ) VALUES (
        (p_routine_data->>'user_id')::UUID,
        p_routine_data->>'routine_name',
        p_routine_data->>'notes',
        (p_routine_data->>'weekdays')::INTEGER[]
    ) RETURNING id INTO new_routine_id;
    
    -- Insert times
    FOR time_data IN SELECT * FROM jsonb_array_elements(p_routine_data->'times')
    LOOP
        INSERT INTO routine_times (
            routine_id,
            time_of_day,
            time_name,
            is_active,
            display_order
        ) VALUES (
            new_routine_id,
            (time_data->>'time_of_day')::TIME,
            time_data->>'time_name',
            COALESCE((time_data->>'is_active')::BOOLEAN, true),
            (time_data->>'display_order')::INTEGER
        ) RETURNING id INTO new_time_id;
        
        -- Insert variables for this time
        FOR variable_data IN SELECT * FROM jsonb_array_elements(time_data->'variables')
        LOOP
            INSERT INTO routine_time_variables (
                routine_time_id,
                variable_id,
                default_value,
                default_unit,
                display_order
            ) VALUES (
                new_time_id,
                (variable_data->>'variable_id')::UUID,
                variable_data->>'default_value',
                variable_data->>'default_unit',
                (variable_data->>'display_order')::INTEGER
            );
        END LOOP;
    END LOOP;
    
    RETURN new_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update an existing routine with times and variables
CREATE OR REPLACE FUNCTION update_routine(p_routine_id UUID, p_routine_data JSONB)
RETURNS VOID AS $$
DECLARE
    time_data JSONB;
    variable_data JSONB;
    new_time_id UUID;
BEGIN
    -- Update the routine
    UPDATE daily_routines SET
        routine_name = p_routine_data->>'routine_name',
        notes = p_routine_data->>'notes',
        weekdays = (p_routine_data->>'weekdays')::INTEGER[],
        updated_at = NOW()
    WHERE id = p_routine_id;
    
    -- Delete existing times (cascades to variables)
    DELETE FROM routine_times WHERE routine_id = p_routine_id;
    
    -- Insert new times
    FOR time_data IN SELECT * FROM jsonb_array_elements(p_routine_data->'times')
    LOOP
        INSERT INTO routine_times (
            routine_id,
            time_of_day,
            time_name,
            is_active,
            display_order
        ) VALUES (
            p_routine_id,
            (time_data->>'time_of_day')::TIME,
            time_data->>'time_name',
            COALESCE((time_data->>'is_active')::BOOLEAN, true),
            (time_data->>'display_order')::INTEGER
        ) RETURNING id INTO new_time_id;
        
        -- Insert variables for this time
        FOR variable_data IN SELECT * FROM jsonb_array_elements(time_data->'variables')
        LOOP
            INSERT INTO routine_time_variables (
                routine_time_id,
                variable_id,
                default_value,
                default_unit,
                display_order
            ) VALUES (
                new_time_id,
                (variable_data->>'variable_id')::UUID,
                variable_data->>'default_value',
                variable_data->>'default_unit',
                (variable_data->>'display_order')::INTEGER
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a routine
CREATE OR REPLACE FUNCTION delete_routine(p_routine_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM daily_routines WHERE id = p_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle routine active status
CREATE OR REPLACE FUNCTION toggle_routine_active(p_routine_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE daily_routines 
    SET is_active = p_is_active, updated_at = NOW()
    WHERE id = p_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle routine time active status
CREATE OR REPLACE FUNCTION toggle_routine_time_active(p_time_id UUID, p_is_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE routine_times 
    SET is_active = p_is_active
    WHERE id = p_time_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 