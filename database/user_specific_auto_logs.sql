-- User-specific auto-logging function for real-time routine execution
-- This function only processes routines for a specific user, making it ideal for real-time triggers

CREATE OR REPLACE FUNCTION create_user_routine_auto_logs(
    p_user_id UUID,
    target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(routine_id UUID, routine_name TEXT, time_name TEXT, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) AS $$
DECLARE
    routine_record RECORD;
    time_record RECORD;
    variable_record RECORD;
    log_exists BOOLEAN;
    manual_log_exists BOOLEAN;
    target_weekday INTEGER;
BEGIN
    -- Validate that user_id is provided
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    -- Get the weekday for the target date (1=Monday, 7=Sunday)
    target_weekday := EXTRACT(dow FROM target_date);
    -- Convert to 1-7 format (PostgreSQL uses 0=Sunday, so we need to adjust)
    IF target_weekday = 0 THEN
        target_weekday := 7;
    END IF;
    
    -- Loop through all active routines for the specific user
    FOR routine_record IN 
        SELECT dr.id, dr.routine_name, dr.user_id, dr.weekdays, dr.notes
        FROM daily_routines dr
        WHERE dr.user_id = p_user_id
        AND dr.is_active = true
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_routine_auto_logs(UUID, DATE) TO authenticated;

-- Create an index to optimize user-specific queries
CREATE INDEX IF NOT EXISTS idx_daily_routines_user_active ON daily_routines(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_routine_log_history_user_date ON routine_log_history(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_variable_logs_user_variable_date ON variable_logs(user_id, variable_id, logged_at); 