-- Fix set_user_unit_preference function to work with JSONB display_unit format
-- The table expects display_unit as JSONB: {"unit_id": "kg", "unit_group": "mass"}

CREATE OR REPLACE FUNCTION set_user_unit_preference(
    user_id_param UUID,
    variable_id_param UUID,
    unit_id_param TEXT,
    unit_group_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    unit_jsonb JSONB;
BEGIN
    -- Validate that the unit is valid for this variable
    IF NOT EXISTS(
        SELECT 1 FROM variable_units vu
        WHERE vu.variable_id = variable_id_param 
        AND vu.unit_id = unit_id_param
    ) THEN
        RAISE NOTICE 'Unit % is not valid for variable %. Available units: %', 
            unit_id_param, 
            variable_id_param,
            (SELECT string_agg(unit_id, ', ') FROM variable_units WHERE variable_id = variable_id_param);
        RETURN FALSE;
    END IF;

    -- Create JSONB object for display_unit
    unit_jsonb := jsonb_build_object(
        'unit_id', unit_id_param,
        'unit_group', COALESCE(unit_group_param, 'unknown')
    );

    -- Insert or update user preference using JSONB format
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, is_shared, created_at, updated_at)
    VALUES (
        user_id_param,
        variable_id_param,
        unit_jsonb,
        COALESCE((
            SELECT is_shared 
            FROM user_variable_preferences 
            WHERE user_id = user_id_param AND variable_id = variable_id_param
        ), false), -- Default to false if no existing preference
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET
        display_unit = unit_jsonb,
        updated_at = NOW();

    RAISE NOTICE 'Successfully saved user preference: user=%, variable=%, unit=% as JSONB: %', 
        user_id_param, variable_id_param, unit_id_param, unit_jsonb;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in set_user_unit_preference: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Update get_user_preferred_unit function to work with JSONB
CREATE OR REPLACE FUNCTION get_user_preferred_unit(
    user_id_param UUID,
    variable_id_param UUID
)
RETURNS TABLE(
    unit_id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT,
    is_base BOOLEAN,
    priority INTEGER,
    is_user_preference BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_preferred_unit_jsonb JSONB;
    user_preferred_unit_id TEXT;
BEGIN
    -- Get user's display unit preference (JSONB format)
    SELECT uvp.display_unit INTO user_preferred_unit_jsonb
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_id_param 
    AND uvp.variable_id = variable_id_param;

    -- Extract unit_id from JSONB
    IF user_preferred_unit_jsonb IS NOT NULL THEN
        user_preferred_unit_id := user_preferred_unit_jsonb->>'unit_id';
        
        -- If user has a preference and unit exists, return it (highest priority)
        IF user_preferred_unit_id IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                u.id as unit_id,
                u.label,
                u.symbol,
                u.unit_group,
                u.is_base,
                -1 as priority, -- User preference gets highest priority
                true as is_user_preference
            FROM units u
            WHERE u.id = user_preferred_unit_id
            LIMIT 1;
            
            -- If we found the preferred unit, return it
            IF FOUND THEN
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Fallback: return the unit with highest priority (lowest priority number) from variable_units
    RETURN QUERY
    SELECT 
        u.id as unit_id,
        u.label,
        u.symbol,
        u.unit_group,
        u.is_base,
        vu.priority,
        false as is_user_preference
    FROM variable_units vu
    JOIN units u ON vu.unit_id = u.id
    WHERE vu.variable_id = variable_id_param
    ORDER BY vu.priority ASC, u.is_base DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_user_unit_preference(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO anon;

-- Test the fixed function
DO $$
DECLARE
    test_result BOOLEAN;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    broccoli_var_id UUID := '3f123d63-4f5a-4c94-8518-1f97858cfcfa';
    rec RECORD;
BEGIN
    RAISE NOTICE 'Testing set_user_unit_preference with fixed JSONB format...';
    
    SELECT set_user_unit_preference(
        test_user_id, 
        broccoli_var_id, 
        'kg', 
        'mass'
    ) INTO test_result;
    
    IF test_result THEN
        RAISE NOTICE '✅ SUCCESS: set_user_unit_preference now works with JSONB format!';
        
        -- Test retrieval
        RAISE NOTICE 'Testing get_user_preferred_unit...';
        FOR rec IN 
            SELECT * FROM get_user_preferred_unit(test_user_id, broccoli_var_id)
        LOOP
            RAISE NOTICE '  Retrieved: % (%) - Priority: % - User pref: %',
                rec.unit_id, rec.label, rec.priority, rec.is_user_preference;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ FAILED: set_user_unit_preference still returning false';
    END IF;
    
    -- Clean up test data
    DELETE FROM user_variable_preferences 
    WHERE user_id = test_user_id 
    AND variable_id = broccoli_var_id;
    
    RAISE NOTICE 'Test cleanup completed.';
END $$;
