-- ============================================================================
-- FIX UNIT VALIDATION FOR ALL VARIABLES
-- ============================================================================
-- This script fixes the unit validation issue that affects all variables
-- where users get "Selected unit is not available" error when selecting valid units

-- ============================================================================
-- STEP 0: Drop existing functions to avoid return type conflicts
-- ============================================================================

DROP FUNCTION IF EXISTS get_variable_units(uuid);
DROP FUNCTION IF EXISTS set_user_unit_preference(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS is_unit_valid_for_variable(uuid, text);
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(text, text);

-- ============================================================================
-- STEP 1: Fix the set_user_unit_preference function with proper validation
-- ============================================================================

CREATE OR REPLACE FUNCTION set_user_unit_preference(
    user_id_param UUID,
    variable_id_param UUID,
    unit_id_param TEXT,
    unit_group_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    unit_group_val TEXT;
    var_unit_groups TEXT[];
    is_valid_unit BOOLEAN := false;
BEGIN
    -- Get unit group if not provided
    IF unit_group_param IS NULL THEN
        SELECT u.unit_group INTO unit_group_val
        FROM units u
        WHERE u.id = unit_id_param;
    ELSE
        unit_group_val := unit_group_param;
    END IF;

    -- Check if the unit is valid for this variable
    -- First check if variable has unit_groups defined in variable_units
    SELECT vu.unit_groups INTO var_unit_groups
    FROM variable_units vu
    WHERE vu.variable_id = variable_id_param
    LIMIT 1;

    -- If variable has unit_groups defined, validate against them
    IF var_unit_groups IS NOT NULL AND array_length(var_unit_groups, 1) > 0 THEN
        -- Check if the unit's group is in the allowed groups
        IF unit_group_val = ANY(var_unit_groups) THEN
            is_valid_unit := true;
        END IF;
    ELSE
        -- Fallback: check if unit exists directly in variable_units table
        SELECT EXISTS(
            SELECT 1 FROM variable_units vu
            WHERE vu.variable_id = variable_id_param 
            AND vu.unit_id = unit_id_param
        ) INTO is_valid_unit;
        
        -- If no direct relationship and no unit_groups, check variable's convertible_units
        IF NOT is_valid_unit THEN
            SELECT EXISTS(
                SELECT 1 FROM variables v
                WHERE v.id = variable_id_param
                AND (
                    v.convertible_units IS NULL OR 
                    v.convertible_units @> to_jsonb(unit_id_param) OR
                    v.canonical_unit = unit_id_param OR
                    v.default_display_unit = unit_id_param
                )
            ) INTO is_valid_unit;
        END IF;
        
        -- Final fallback: if variable has a unit_group that matches the unit's group
        IF NOT is_valid_unit THEN
            SELECT EXISTS(
                SELECT 1 FROM variables v
                JOIN units u ON u.id = unit_id_param
                WHERE v.id = variable_id_param
                AND v.unit_group = u.unit_group
            ) INTO is_valid_unit;
        END IF;
    END IF;

    -- Return false if unit is not valid for this variable
    IF NOT is_valid_unit THEN
        RETURN false;
    END IF;

    -- Update or insert user preference with display_unit as JSONB
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, is_shared)
    VALUES (
        user_id_param,
        variable_id_param,
        jsonb_build_object(
            'unit_id', unit_id_param,
            'unit_group', unit_group_val
        ),
        false -- Default to not shared
    )
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET
        display_unit = jsonb_build_object(
            'unit_id', unit_id_param,
            'unit_group', unit_group_val
        ),
        updated_at = NOW();

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE NOTICE 'Error in set_user_unit_preference: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Ensure user_variable_preferences table has display_unit column
-- ============================================================================

-- Add display_unit column as JSONB if it doesn't exist
ALTER TABLE user_variable_preferences 
ADD COLUMN IF NOT EXISTS display_unit JSONB;

-- ============================================================================
-- STEP 3: Update get_variable_units function to handle all scenarios
-- ============================================================================

CREATE OR REPLACE FUNCTION get_variable_units(var_id UUID)
RETURNS TABLE(
    unit_id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT,
    is_base BOOLEAN,
    is_default_group BOOLEAN
) AS $$
DECLARE
    var_unit_groups TEXT[];
    default_group TEXT;
    var_convertible_units JSONB;
    var_unit_group TEXT;
BEGIN
    -- Get variable configuration from variable_units table
    SELECT vu.unit_groups, vu.default_unit_group 
    INTO var_unit_groups, default_group
    FROM variable_units vu
    WHERE vu.variable_id = var_id
    LIMIT 1;

    -- If variable has unit_groups defined, use them
    IF var_unit_groups IS NOT NULL AND array_length(var_unit_groups, 1) > 0 THEN
        RETURN QUERY
        SELECT 
            u.id,
            u.label,
            u.symbol,
            u.unit_group,
            u.is_base,
            (u.unit_group = default_group) as is_default_group
        FROM units u
        WHERE u.unit_group = ANY(var_unit_groups)
        ORDER BY 
            (u.unit_group = default_group) DESC, -- Default group first
            u.unit_group,
            u.is_base DESC, -- Base unit first within each group
            u.label;
        RETURN;
    END IF;

    -- Fallback: get from variables table convertible_units or unit_group
    SELECT v.convertible_units, v.unit_group
    INTO var_convertible_units, var_unit_group
    FROM variables v
    WHERE v.id = var_id;

    -- If convertible_units is defined as JSON array
    IF var_convertible_units IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            u.id,
            u.label,
            u.symbol,
            u.unit_group,
            u.is_base,
            (u.unit_group = var_unit_group) as is_default_group
        FROM units u
        WHERE u.id IN (
            SELECT jsonb_array_elements_text(var_convertible_units)
        )
        ORDER BY 
            (u.unit_group = var_unit_group) DESC,
            u.is_base DESC,
            u.label;
        RETURN;
    END IF;

    -- Final fallback: if variable has unit_group, return all units from that group
    IF var_unit_group IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            u.id,
            u.label,
            u.symbol,
            u.unit_group,
            u.is_base,
            true as is_default_group
        FROM units u
        WHERE u.unit_group = var_unit_group
        ORDER BY 
            u.is_base DESC,
            u.label;
        RETURN;
    END IF;

    -- No configuration found, return empty
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 4: Create a helper function to check if a unit is valid for a variable
-- ============================================================================

CREATE OR REPLACE FUNCTION is_unit_valid_for_variable(
    variable_id_param UUID,
    unit_id_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    unit_group_val TEXT;
    var_unit_groups TEXT[];
    is_valid BOOLEAN := false;
BEGIN
    -- Get the unit's group
    SELECT u.unit_group INTO unit_group_val
    FROM units u
    WHERE u.id = unit_id_param;

    -- Check if variable has unit_groups defined
    SELECT vu.unit_groups INTO var_unit_groups
    FROM variable_units vu
    WHERE vu.variable_id = variable_id_param
    LIMIT 1;

    -- If variable has unit_groups, check if unit's group is allowed
    IF var_unit_groups IS NOT NULL AND array_length(var_unit_groups, 1) > 0 THEN
        RETURN unit_group_val = ANY(var_unit_groups);
    END IF;

    -- Fallback checks using variables table
    SELECT EXISTS(
        SELECT 1 FROM variables v
        WHERE v.id = variable_id_param
        AND (
            v.convertible_units IS NULL OR 
            v.convertible_units @> to_jsonb(unit_id_param) OR
            v.canonical_unit = unit_id_param OR
            v.default_display_unit = unit_id_param OR
            v.unit_group = unit_group_val
        )
    ) INTO is_valid;

    RETURN is_valid;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 5: Test and verification
-- ============================================================================

-- Create a function to test unit validation for any variable
CREATE OR REPLACE FUNCTION test_unit_validation_for_variable(
    variable_slug_param TEXT,
    test_unit_id TEXT
)
RETURNS TABLE(
    variable_name TEXT,
    unit_tested TEXT,
    is_valid BOOLEAN,
    available_units TEXT[]
) AS $$
DECLARE
    var_id UUID;
BEGIN
    -- Get variable ID
    SELECT id INTO var_id FROM variables WHERE slug = variable_slug_param;
    
    IF var_id IS NULL THEN
        RAISE EXCEPTION 'Variable with slug % not found', variable_slug_param;
    END IF;

    RETURN QUERY
    SELECT 
        variable_slug_param,
        test_unit_id,
        is_unit_valid_for_variable(var_id, test_unit_id),
        ARRAY(
            SELECT vu.unit_id 
            FROM get_variable_units(var_id) vu
        );
END;
$$ LANGUAGE plpgsql;

SELECT '✅ General unit validation system implemented for all variables!' as result; 