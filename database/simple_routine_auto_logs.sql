-- Simple routine auto-logging function with minute-based duplicate prevention and debugging
-- Works with routine_variables table that has times as a jsonb[] column

CREATE OR REPLACE FUNCTION create_simple_routine_auto_logs(
    p_user_id UUID,
    target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    variable_id UUID, 
    variable_name TEXT, 
    routine_time TEXT, 
    auto_logged BOOLEAN, 
    error_message TEXT
) AS $$
DECLARE
    routine_var_record RECORD;
    time_entry JSONB;
    minute_log_exists BOOLEAN;
    target_weekday INTEGER;
    curr_time TIME;
    routine_time TIME;
    time_diff NUMERIC;
    i INTEGER;
    times_array_length INTEGER;
    target_datetime TIMESTAMP;
    minute_start TIMESTAMP;
    minute_end TIMESTAMP;
BEGIN
    -- Validate that user_id is provided
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    -- Get the current time and weekday for the target date
    curr_time := CURRENT_TIME;
    target_weekday := EXTRACT(dow FROM target_date);
    -- Convert to 1-7 format (PostgreSQL uses 0=Sunday, so we need to adjust)
    IF target_weekday = 0 THEN
        target_weekday := 7;
    END IF;
    
    -- Loop through all routine variables for the user
    FOR routine_var_record IN 
        SELECT 
            rv.id,
            rv.routine_id,
            rv.variable_id,
            rv.weekdays,
            rv.times,
            rv.default_value,
            v.label as variable_name,
            r.user_id
        FROM routine_variables rv
        JOIN variables v ON rv.variable_id = v.id
        JOIN routines r ON rv.routine_id = r.id
        WHERE r.user_id = p_user_id
        AND r.is_active = true
        AND target_weekday = ANY(rv.weekdays)
    LOOP
        -- Get the length of the times array (jsonb[])
        times_array_length := array_length(routine_var_record.times, 1);
        
        -- Skip if no times array
        IF times_array_length IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Loop through each time in the times array
        FOR i IN 1..times_array_length LOOP
            -- Get the time entry at index i (1-based for PostgreSQL arrays)
            time_entry := routine_var_record.times[i];
            
            -- Extract time from the JSONB entry
            IF jsonb_typeof(time_entry) = 'string' THEN
                routine_time := (time_entry #>> '{}')::TIME;
            ELSE
                routine_time := (time_entry ->> 'time')::TIME;
            END IF;
            
            -- Check if current time matches routine time (within 1 minute tolerance)
            time_diff := ABS(EXTRACT(EPOCH FROM (curr_time - routine_time)));
            
            -- If times match (within 60 seconds tolerance)
            IF time_diff <= 60 THEN
                -- Create target datetime for this specific time
                target_datetime := target_date::timestamp + routine_time;
                
                -- Define the minute window (same minute only)
                minute_start := date_trunc('minute', target_datetime);
                minute_end := minute_start + INTERVAL '1 minute';
                
                -- Check if routine log already exists for this specific minute
                SELECT EXISTS(
                    SELECT 1 FROM logs l
                    WHERE l.user_id = p_user_id 
                    AND l.variable_id = routine_var_record.variable_id
                    AND l.created_at >= minute_start
                    AND l.created_at < minute_end
                    AND 'routine' = ANY(l.source)
                ) INTO minute_log_exists;
                
                -- If no log exists for this minute, create auto-log
                IF NOT minute_log_exists THEN
                    BEGIN
                        RAISE NOTICE 'Attempting to insert log: user_id=%, variable_id=%, routine_id=%, value=%, date=%, source=%, created_at=%',
                            p_user_id, routine_var_record.variable_id, routine_var_record.routine_id,
                            routine_var_record.default_value::TEXT, target_date::TEXT, ARRAY['routine'], target_datetime;
                        -- Insert auto-log into logs table
                        INSERT INTO logs (
                            user_id,
                            variable_id,
                            routine_id,
                            value,
                            date,
                            source,
                            created_at
                        ) VALUES (
                            p_user_id,
                            routine_var_record.variable_id,
                            routine_var_record.routine_id,
                            routine_var_record.default_value::TEXT,
                            target_date::TEXT,
                            ARRAY['routine'],
                            target_datetime
                        );
                        RAISE NOTICE 'Insert completed';
                        -- Return success
                        variable_id := routine_var_record.variable_id;
                        variable_name := routine_var_record.variable_name;
                        routine_time := routine_time::TEXT;
                        auto_logged := true;
                        error_message := NULL;
                        RETURN NEXT;
                    EXCEPTION WHEN OTHERS THEN
                        variable_id := routine_var_record.variable_id;
                        variable_name := routine_var_record.variable_name;
                        routine_time := routine_time::TEXT;
                        auto_logged := false;
                        error_message := 'Insert failed: ' || SQLERRM;
                        RETURN NEXT;
                    END;
                ELSE
                    -- Return skipped info (minute already logged)
                    variable_id := routine_var_record.variable_id;
                    variable_name := routine_var_record.variable_name;
                    routine_time := routine_time::TEXT;
                    auto_logged := false;
                    error_message := 'Already logged for this minute';
                    RETURN NEXT;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_simple_routine_auto_logs(UUID, DATE) TO authenticated;

-- Create indexes to optimize queries
CREATE INDEX IF NOT EXISTS idx_routine_variables_user_weekdays ON routine_variables(routine_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_variable_date ON logs(user_id, variable_id, created_at);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs USING GIN(source); 