-- Updated database functions to support weekdays at variable level
-- Run this in Supabase SQL Editor
-- 
-- Table relationships:
-- - routine_id points to routines.id
-- - variable_id points to variables.id
-- - weekdays is an integer array in routine_variables table
-- - default_value is jsonb in routine_variables table
-- - default_unit is text in routine_variables table
-- - times is a jsonb array in routine_variables table
 
-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_user_routines(uuid);
DROP FUNCTION IF EXISTS create_routine(jsonb);
DROP FUNCTION IF EXISTS update_routine(uuid, jsonb);
DROP FUNCTION IF EXISTS delete_routine(uuid);
DROP FUNCTION IF EXISTS toggle_routine_active(uuid);

-- Add default_unit column to routine_variables table if it doesn't exist
ALTER TABLE routine_variables ADD COLUMN IF NOT EXISTS default_unit TEXT;

-- Function to get user routines with weekdays at variable level
CREATE OR REPLACE FUNCTION get_user_routines(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    routine_name TEXT,
    notes TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    variables JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.routine_name,
        r.notes,
        r.is_active,
        r.created_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', rv.id,
                    'variable_id', rv.variable_id,
                    'variable_name', v.label,
                    'variable_slug', v.slug,
                    'default_value', rv.default_value,
                    'default_unit', rv.default_unit,
                    'weekdays', rv.weekdays,
                    'times', rv.times
                )
                ORDER BY rv.created_at
            ) FILTER (WHERE rv.id IS NOT NULL),
            '[]'::jsonb
        ) AS variables
    FROM routines r
    LEFT JOIN routine_variables rv ON r.id = rv.routine_id
    LEFT JOIN variables v ON rv.variable_id = v.id
    WHERE r.user_id = p_user_id
    GROUP BY r.id, r.routine_name, r.notes, r.is_active, r.created_at
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create a routine with weekdays at variable level
CREATE OR REPLACE FUNCTION create_routine(p_routine_data JSONB)
RETURNS UUID AS $$
DECLARE
    new_routine_id UUID;
    variable_data JSONB;
BEGIN
    -- Insert new routine
    INSERT INTO routines (user_id, routine_name, notes, is_active)
    VALUES (
        (p_routine_data->>'user_id')::UUID,
        p_routine_data->>'routine_name',
        p_routine_data->>'notes',
        true
    )
    RETURNING id INTO new_routine_id;

    -- Insert routine variables with weekdays and times
    FOR variable_data IN SELECT * FROM jsonb_array_elements(p_routine_data->'variables')
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
            (variable_data->>'variable_id')::UUID,
            variable_data->'default_value',
            variable_data->>'default_unit',
            ARRAY(SELECT jsonb_array_elements_text(variable_data->'weekdays')::INTEGER),
            ARRAY(SELECT jsonb_array_elements(variable_data->'times'))
        );
    END LOOP;

    RETURN new_routine_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update a routine with weekdays at variable level
CREATE OR REPLACE FUNCTION update_routine(p_routine_id UUID, p_routine_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    variable_data JSONB;
BEGIN
    -- Update routine details
    UPDATE routines
    SET 
        routine_name = p_routine_data->>'routine_name',
        notes = p_routine_data->>'notes',
        updated_at = NOW()
    WHERE id = p_routine_id;

    -- Delete existing routine variables
    DELETE FROM routine_variables WHERE routine_id = p_routine_id;

    -- Insert updated routine variables
    FOR variable_data IN SELECT * FROM jsonb_array_elements(p_routine_data->'variables')
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
            (variable_data->>'variable_id')::UUID,
            variable_data->'default_value',
            variable_data->>'default_unit',
            ARRAY(SELECT jsonb_array_elements_text(variable_data->'weekdays')::INTEGER),
            ARRAY(SELECT jsonb_array_elements(variable_data->'times'))
        );
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a routine
CREATE OR REPLACE FUNCTION delete_routine(p_routine_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM routines WHERE id = p_routine_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle routine active status
CREATE OR REPLACE FUNCTION toggle_routine_active(p_routine_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE routines
    SET is_active = NOT is_active,
        updated_at = NOW()
    WHERE id = p_routine_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql; 