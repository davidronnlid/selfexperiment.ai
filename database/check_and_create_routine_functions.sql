-- ============================================================================
-- CHECK AND CREATE MISSING ROUTINE FUNCTIONS
-- ============================================================================

-- First, check if functions exist
SELECT 
    proname as function_name,
    CASE WHEN proname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES ('create_routine'), ('update_routine'), ('delete_routine')) AS f(fname)
LEFT JOIN pg_proc ON proname = fname;

-- Create missing create_routine function if needed
CREATE OR REPLACE FUNCTION create_routine(p_routine_data JSONB)
RETURNS UUID 
SET search_path = ''
AS $$
DECLARE
    new_routine_id UUID;
    variable_data JSONB;
    variable_item JSONB;
BEGIN
    -- Insert into routines table
    INSERT INTO routines (
        user_id,
        routine_name,
        notes
    ) VALUES (
        (p_routine_data->>'user_id')::UUID,
        p_routine_data->>'routine_name',
        p_routine_data->>'notes'
    ) RETURNING id INTO new_routine_id;
    
    -- Insert routine variables
    variable_data := p_routine_data->'variables';
    IF variable_data IS NOT NULL AND jsonb_array_length(variable_data) > 0 THEN
        FOR variable_item IN SELECT * FROM jsonb_array_elements(variable_data)
        LOOP
            INSERT INTO routine_variables (
                routine_id,
                variable_id,
                default_value,
                default_unit,
                weekdays,
                times
            ) VALUES (
                new_routine_id,
                (variable_item->>'variable_id')::UUID,
                to_jsonb(variable_item->>'default_value'),
                variable_item->>'default_unit',
                (variable_item->>'weekdays')::INTEGER[],
                variable_item->'times'
            );
        END LOOP;
    END IF;
    
    RETURN new_routine_id;
END;
$$ LANGUAGE plpgsql;

-- Create missing update_routine function if needed
CREATE OR REPLACE FUNCTION update_routine(p_routine_id UUID, p_routine_data JSONB)
RETURNS VOID 
SET search_path = ''
AS $$
DECLARE
    variable_data JSONB;
    variable_item JSONB;
BEGIN
    -- Update routines table
    UPDATE routines SET
        routine_name = p_routine_data->>'routine_name',
        notes = p_routine_data->>'notes',
        updated_at = NOW()
    WHERE id = p_routine_id;
    
    -- Delete existing routine variables
    DELETE FROM routine_variables WHERE routine_id = p_routine_id;
    
    -- Insert new routine variables
    variable_data := p_routine_data->'variables';
    IF variable_data IS NOT NULL AND jsonb_array_length(variable_data) > 0 THEN
        FOR variable_item IN SELECT * FROM jsonb_array_elements(variable_data)
        LOOP
            INSERT INTO routine_variables (
                routine_id,
                variable_id,
                default_value,
                default_unit,
                weekdays,
                times
            ) VALUES (
                p_routine_id,
                (variable_item->>'variable_id')::UUID,
                to_jsonb(variable_item->>'default_value'),
                variable_item->>'default_unit',
                (variable_item->>'weekdays')::INTEGER[],
                variable_item->'times'
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Show final status
SELECT 'Routine functions created/updated successfully!' as result;