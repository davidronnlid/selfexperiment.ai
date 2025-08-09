-- ============================================================================
-- FIX USER UNIT PREFERENCE FUNCTION
-- ============================================================================
-- This script fixes the set_user_unit_preference function to work with the
-- current database schema and properly save user preferences

-- Step 1: Check current function
SELECT 'Current set_user_unit_preference function:' as info;
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'set_user_unit_preference' 
AND routine_schema = 'public';

-- Step 2: Drop existing function variants
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT, TEXT);

-- Step 3: Check user_variable_preferences table structure
SELECT 'Current user_variable_preferences columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_variable_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Add display_unit column if it doesn't exist
ALTER TABLE user_variable_preferences 
ADD COLUMN IF NOT EXISTS display_unit TEXT;

-- Step 5: Create the correct function
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

    -- Insert or update user preference - using TEXT format for now
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, is_shared, created_at, updated_at)
    VALUES (
        user_id_param,
        variable_id_param,
        unit_id_param, -- Store as simple TEXT for now
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
        display_unit = unit_id_param,
        updated_at = NOW();

    RAISE NOTICE 'Successfully saved user preference: user=%, variable=%, unit=%', 
        user_id_param, variable_id_param, unit_id_param;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in set_user_unit_preference: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update get_user_preferred_unit function
DROP FUNCTION IF EXISTS get_user_preferred_unit(UUID, UUID);
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
    user_preferred_unit TEXT;
BEGIN
    -- Get user's display unit preference (TEXT format)
    SELECT uvp.display_unit INTO user_preferred_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_id_param 
    AND uvp.variable_id = variable_id_param;

    -- If user has a preference and unit exists, return it (highest priority)
    IF user_preferred_unit IS NOT NULL THEN
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
        WHERE u.id = user_preferred_unit
        LIMIT 1;
        
        -- If we found the preferred unit, return it
        IF FOUND THEN
            RETURN;
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

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION set_user_unit_preference(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO anon;

-- Step 8: Test the function with broccoli and kg
DO $$
DECLARE
    broccoli_var_id UUID;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    result BOOLEAN;
BEGIN
    -- Get broccoli variable ID
    SELECT id INTO broccoli_var_id 
    FROM variables 
    WHERE slug = 'broccoli' 
    LIMIT 1;
    
    IF broccoli_var_id IS NOT NULL THEN
        RAISE NOTICE 'Testing set_user_unit_preference for broccoli + kg';
        
        -- Test if we can set kg as preference
        SELECT set_user_unit_preference(test_user_id, broccoli_var_id, 'kg', 'mass') INTO result;
        
        IF result THEN
            RAISE NOTICE '✅ SUCCESS: kg unit preference saved for broccoli';
        ELSE
            RAISE NOTICE '❌ FAILED: Could not save kg preference for broccoli';
        END IF;
        
        -- Show available units for debugging
        RAISE NOTICE 'Available units for broccoli: %', 
            (SELECT string_agg(vu.unit_id || '(priority:' || vu.priority || ')', ', ') 
             FROM variable_units vu WHERE vu.variable_id = broccoli_var_id);
             
    ELSE
        RAISE NOTICE 'Broccoli variable not found';
    END IF;
END $$;

SELECT '✅ Unit preference function updated! Try selecting kg again.' as result;