-- Fix get_user_preferred_unit function to work with current database schema

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_user_preferred_unit(UUID, UUID);

-- Create a simplified version that works with current schema
CREATE OR REPLACE FUNCTION get_user_preferred_unit(
    user_id_param UUID,
    variable_id_param UUID
)
RETURNS TABLE(
    unit_id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_display_unit JSONB;
    preferred_unit_id TEXT;
    fallback_unit_record RECORD;
BEGIN
    -- Get user's display unit preference from JSONB column
    SELECT uvp.display_unit INTO user_display_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_id_param 
    AND uvp.variable_id = variable_id_param;

    -- Extract preferred unit from display_unit JSON
    IF user_display_unit IS NOT NULL THEN
        preferred_unit_id := user_display_unit->>'unit_id';
    END IF;

    -- If user has a preference and unit exists, return it
    IF preferred_unit_id IS NOT NULL THEN
        RETURN QUERY
        SELECT u.id, u.label, u.symbol, u.unit_group
        FROM units u
        WHERE u.id = preferred_unit_id
        LIMIT 1;
        
        -- If we found the preferred unit, return it
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;

    -- Fallback: return the first available unit for the variable (priority 1)
    SELECT u.id, u.label, u.symbol, u.unit_group
    INTO fallback_unit_record
    FROM units u
    JOIN variable_units vu ON u.id = vu.unit_id
    WHERE vu.variable_id = variable_id_param
    ORDER BY vu.priority ASC, u.is_base DESC
    LIMIT 1;
    
    IF fallback_unit_record.id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            fallback_unit_record.id,
            fallback_unit_record.label,
            fallback_unit_record.symbol,
            fallback_unit_record.unit_group;
        RETURN;
    END IF;

    -- If no units configured, return empty result
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO anon;

-- Test the function
DO $$
DECLARE
    test_user_id UUID := '027fb1e7-d871-447c-8845-f39269e63e39'; -- Using a variable ID as fake user ID for testing
    sleep_time_var_id UUID;
    result_count INTEGER;
    unit_record RECORD;
BEGIN
    -- Get Sleep Time variable ID
    SELECT id INTO sleep_time_var_id 
    FROM variables 
    WHERE label ILIKE '%sleep%time%'
    LIMIT 1;
    
    IF sleep_time_var_id IS NOT NULL THEN
        RAISE NOTICE 'Testing get_user_preferred_unit for Sleep Time variable: %', sleep_time_var_id;
        
        -- Test the function
        SELECT COUNT(*) INTO result_count
        FROM get_user_preferred_unit(test_user_id, sleep_time_var_id);
        
        RAISE NOTICE 'get_user_preferred_unit returned % results', result_count;
        
        -- Show the result
        FOR unit_record IN 
            SELECT unit_id, label, symbol, unit_group
            FROM get_user_preferred_unit(test_user_id, sleep_time_var_id)
        LOOP
            RAISE NOTICE 'Preferred unit for Sleep Time: % (%) - %', 
                unit_record.label, 
                unit_record.symbol, 
                unit_record.unit_group;
        END LOOP;
    ELSE
        RAISE NOTICE 'Sleep Time variable not found';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing get_user_preferred_unit: %', SQLERRM;
END $$;
