-- ============================================================================
-- FIX USER UNIT PREFERENCE FUNCTION
-- ============================================================================
-- This migration fixes the set_user_unit_preference function to work with the
-- current database schema and properly save user preferences

-- Step 1: Add display_unit column if it doesn't exist
ALTER TABLE user_variable_preferences 
ADD COLUMN IF NOT EXISTS display_unit TEXT;

-- Step 2: Drop existing function variants
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT, TEXT);

-- Step 3: Create the correct function
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
        -- Don't raise an exception, just return false for invalid units
        RETURN FALSE;
    END IF;

    -- Insert or update user preference - using TEXT format
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, is_shared, created_at, updated_at)
    VALUES (
        user_id_param,
        variable_id_param,
        unit_id_param, -- Store as simple TEXT
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
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update get_user_preferred_unit function
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

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION set_user_unit_preference(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO anon;
