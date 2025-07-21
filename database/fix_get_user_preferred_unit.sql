-- ============================================================================
-- FIX GET_USER_PREFERRED_UNIT FUNCTION
-- ============================================================================
-- This script fixes the get_user_preferred_unit function to work with the new
-- display_unit JSONB structure in user_variable_preferences table

-- ============================================================================
-- Update the get_user_preferred_unit function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_preferred_unit(
    user_id_param UUID,
    variable_id_param UUID
)
RETURNS TABLE(
    unit_id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT
) AS $$
DECLARE
    user_display_unit JSONB;
    preferred_unit_id TEXT;
    preferred_group TEXT;
    default_group TEXT;
    default_unit_id TEXT;
BEGIN
    -- Get user's display unit preference from JSONB column
    SELECT uvp.display_unit INTO user_display_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_id_param 
    AND uvp.variable_id = variable_id_param;

    -- Extract preferred unit from display_unit JSON
    IF user_display_unit IS NOT NULL THEN
        preferred_unit_id := user_display_unit->>'unit_id';
        preferred_group := user_display_unit->>'unit_group';
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

    -- Fall back to default unit group base unit
    SELECT vu.default_unit_group INTO default_group
    FROM variable_units vu
    WHERE vu.variable_id = variable_id_param
    LIMIT 1;

    -- Get base unit for default group
    IF default_group IS NOT NULL THEN
        SELECT u.id INTO default_unit_id
        FROM units u
        WHERE u.unit_group = default_group AND u.is_base = true
        LIMIT 1;

        IF default_unit_id IS NOT NULL THEN
            RETURN QUERY
            SELECT u.id, u.label, u.symbol, u.unit_group
            FROM units u
            WHERE u.id = default_unit_id;
            RETURN;
        END IF;
    END IF;

    -- Final fallback: return first available unit for the variable
    RETURN QUERY
    SELECT u.id, u.label, u.symbol, u.unit_group
    FROM units u
    WHERE u.unit_group IN (
        SELECT unnest(vu.unit_groups) 
        FROM variable_units vu 
        WHERE vu.variable_id = variable_id_param
    )
    AND u.is_base = true
    LIMIT 1;
    
    -- If still nothing, return any unit associated with the variable
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT u.id, u.label, u.symbol, u.unit_group
        FROM units u
        JOIN variable_units vu ON u.id = vu.unit_id
        WHERE vu.variable_id = variable_id_param
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Also update the simplified version for backward compatibility
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_preferred_unit_simple(
    user_uuid UUID,
    variable_uuid UUID
) RETURNS TEXT AS $$
DECLARE
    preferred_unit TEXT;
    user_display_unit JSONB;
BEGIN
    -- Get user's display unit preference from JSONB
    SELECT uvp.display_unit INTO user_display_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_uuid 
      AND uvp.variable_id = variable_uuid;
    
    -- Extract unit_id from JSONB
    IF user_display_unit IS NOT NULL THEN
        preferred_unit := user_display_unit->>'unit_id';
    END IF;
    
    -- If no user preference, return variable's default
    IF preferred_unit IS NULL THEN
        SELECT v.default_display_unit
        INTO preferred_unit
        FROM variables v
        WHERE v.id = variable_uuid;
    END IF;
    
    -- If still no preference, return canonical unit
    IF preferred_unit IS NULL THEN
        SELECT v.canonical_unit
        INTO preferred_unit
        FROM variables v
        WHERE v.id = variable_uuid;
    END IF;
    
    RETURN preferred_unit;
END;
$$ LANGUAGE plpgsql STABLE;

SELECT '✅ get_user_preferred_unit function updated for JSONB display_unit!' as result; 