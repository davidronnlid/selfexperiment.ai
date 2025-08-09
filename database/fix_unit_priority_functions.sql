-- ============================================================================
-- FIX UNIT PRIORITY FUNCTIONS
-- ============================================================================
-- This script fixes the get_variable_units and get_user_preferred_unit functions
-- to properly use the priority system where:
-- - Lower priority numbers = higher priority (1 is highest priority)
-- - User preferences in user_variable_preferences.display_unit act as priority -1 (highest)
-- - Functions return correct data structure for frontend

-- ============================================================================
-- UPDATE get_variable_units FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_variable_units(UUID);
CREATE OR REPLACE FUNCTION get_variable_units(var_id UUID)
RETURNS TABLE(
    unit_id TEXT, 
    label TEXT, 
    symbol TEXT, 
    unit_group TEXT,
    is_base BOOLEAN,
    is_default_group BOOLEAN,
    priority INTEGER
) 
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as unit_id,
        u.label,
        u.symbol,
        u.unit_group,
        u.is_base,
        (u.unit_group = vu.default_unit_group) as is_default_group,
        vu.priority
    FROM variable_units vu
    JOIN units u ON vu.unit_id = u.id
    WHERE vu.variable_id = var_id
    ORDER BY vu.priority ASC, u.label ASC; -- Lower priority numbers first
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE get_user_preferred_unit FUNCTION
-- ============================================================================

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
SET search_path = ''
AS $$
DECLARE
    user_preferred_unit TEXT;
BEGIN
    -- Check user preference first (acts as priority -1)
    SELECT display_unit INTO user_preferred_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_id_param 
      AND uvp.variable_id = variable_id_param
      AND uvp.display_unit IS NOT NULL;
    
    -- If user has a preference, return that unit
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
        WHERE u.id = user_preferred_unit;
    ELSE
        -- Return the unit with highest priority (lowest priority number)
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
        ORDER BY vu.priority ASC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE/UPDATE set_user_unit_preference FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION set_user_unit_preference(
    user_id_param UUID,
    variable_id_param UUID,
    unit_id_param TEXT,
    unit_group_param TEXT
)
RETURNS BOOLEAN 
SET search_path = ''
AS $$
BEGIN
    -- Insert or update user preference
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit)
    VALUES (user_id_param, variable_id_param, unit_id_param)
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

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_variable_units(UUID) IS 'Get all available units for a variable, ordered by priority (lower numbers = higher priority)';
COMMENT ON FUNCTION get_user_preferred_unit(UUID, UUID) IS 'Get user preferred unit or default unit with highest priority. User preferences act as priority -1';
COMMENT ON FUNCTION set_user_unit_preference(UUID, UUID, TEXT, TEXT) IS 'Set or update user unit preference for a variable';