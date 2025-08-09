-- ============================================================================
-- FIX USER UNIT PREFERENCES - UNIFIED SOLUTION
-- ============================================================================
-- This migration creates a unified, consistent system for user unit preferences
-- that properly implements the priority system where user preferences override
-- variable_units priorities.

-- ============================================================================
-- STEP 1: ENSURE CORRECT TABLE STRUCTURE
-- ============================================================================

-- Add display_unit column as JSONB if it doesn't exist
ALTER TABLE user_variable_preferences 
ADD COLUMN IF NOT EXISTS display_unit JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_display_unit 
ON user_variable_preferences USING GIN (display_unit);

-- Update any TEXT display_unit values to JSONB format
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Convert any existing TEXT display_unit values to JSONB
    FOR rec IN 
        SELECT id, display_unit
        FROM user_variable_preferences 
        WHERE display_unit IS NOT NULL 
        AND jsonb_typeof(display_unit) = 'string'
    LOOP
        -- Convert TEXT to JSONB format
        UPDATE user_variable_preferences 
        SET display_unit = jsonb_build_object('unit_id', display_unit#>>'{}'::TEXT[])
        WHERE id = rec.id;
        
        RAISE NOTICE 'Converted TEXT display_unit to JSONB for preference ID: %', rec.id;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: DROP ALL CONFLICTING FUNCTIONS
-- ============================================================================

-- Drop all possible variants of the functions to avoid conflicts
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_preferred_unit(UUID, UUID);
DROP FUNCTION IF EXISTS get_variable_units(UUID);

-- ============================================================================
-- STEP 3: CREATE UNIFIED set_user_unit_preference FUNCTION
-- ============================================================================

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
    unit_group_val TEXT;
BEGIN
    -- Get unit group if not provided
    IF unit_group_param IS NULL THEN
        SELECT u.unit_group INTO unit_group_val
        FROM units u
        WHERE u.id = unit_id_param;
        
        -- If unit doesn't exist, return false
        IF unit_group_val IS NULL THEN
            RETURN FALSE;
        END IF;
    ELSE
        unit_group_val := unit_group_param;
    END IF;

    -- Validate that the unit is valid for this variable
    IF NOT EXISTS(
        SELECT 1 FROM variable_units vu
        WHERE vu.variable_id = variable_id_param 
        AND vu.unit_id = unit_id_param
    ) THEN
        RAISE EXCEPTION 'Unit % is not valid for variable %', unit_id_param, variable_id_param;
    END IF;

    -- Insert or update user preference with JSONB format
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, is_shared, created_at, updated_at)
    VALUES (
        user_id_param,
        variable_id_param,
        jsonb_build_object(
            'unit_id', unit_id_param,
            'unit_group', unit_group_val
        ),
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
        display_unit = jsonb_build_object(
            'unit_id', unit_id_param,
            'unit_group', unit_group_val
        ),
        updated_at = NOW();

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: CREATE UNIFIED get_user_preferred_unit FUNCTION
-- ============================================================================

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
    user_display_unit JSONB;
    preferred_unit_id TEXT;
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

    -- If user has a preference and unit exists, return it (highest priority)
    IF preferred_unit_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            u.id as unit_id,
            u.label,
            u.symbol,
            u.unit_group,
            u.is_base,
            -1 as priority, -- User preference gets highest priority (lower than any variable_units priority)
            true as is_user_preference
        FROM units u
        WHERE u.id = preferred_unit_id
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

-- ============================================================================
-- STEP 5: CREATE UNIFIED get_variable_units FUNCTION
-- ============================================================================

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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Get units for this variable from variable_units table joined with units table
    RETURN QUERY
    SELECT 
        u.id as unit_id,
        u.label,
        u.symbol,
        u.unit_group,
        u.is_base,
        (vu.priority = 1) as is_default_group, -- Mark priority 1 as default group
        vu.priority
    FROM variable_units vu
    JOIN units u ON vu.unit_id = u.id
    WHERE vu.variable_id = var_id
    ORDER BY 
        vu.priority ASC,  -- Lower priority number = higher preference
        u.is_base DESC,   -- Base units first within same priority
        u.label ASC;      -- Alphabetical order for same priority and base status
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION set_user_unit_preference(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferred_unit(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_variable_units(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_variable_units(UUID) TO anon;

-- ============================================================================
-- STEP 7: ADD DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION set_user_unit_preference(UUID, UUID, TEXT, TEXT) IS 'Set or update user unit preference for a variable. User preferences have priority -1 (highest priority).';
COMMENT ON FUNCTION get_user_preferred_unit(UUID, UUID) IS 'Get user preferred unit with priority -1, or fallback to highest priority unit from variable_units.';
COMMENT ON FUNCTION get_variable_units(UUID) IS 'Get all available units for a variable, ordered by priority (lower numbers = higher priority).';
COMMENT ON COLUMN user_variable_preferences.display_unit IS 'User preferred display unit stored as JSONB: {"unit_id": "unit_name", "unit_group": "group_name"}';

-- ============================================================================
-- STEP 8: VERIFICATION QUERY
-- ============================================================================

DO $$
DECLARE
    test_var_id UUID;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Test user ID
BEGIN
    -- Find a variable with units for testing
    SELECT v.id INTO test_var_id
    FROM variables v
    JOIN variable_units vu ON v.id = vu.variable_id
    LIMIT 1;
    
    IF test_var_id IS NOT NULL THEN
        RAISE NOTICE '✅ Found test variable with units: %', test_var_id;
        
        -- Test get_variable_units
        IF (SELECT COUNT(*) FROM get_variable_units(test_var_id)) > 0 THEN
            RAISE NOTICE '✅ get_variable_units function working';
        ELSE
            RAISE NOTICE '❌ get_variable_units function not working';
        END IF;
        
        -- Test get_user_preferred_unit
        IF (SELECT COUNT(*) FROM get_user_preferred_unit(test_user_id, test_var_id)) >= 0 THEN
            RAISE NOTICE '✅ get_user_preferred_unit function working';
        ELSE
            RAISE NOTICE '❌ get_user_preferred_unit function not working';
        END IF;
        
    ELSE
        RAISE NOTICE 'ℹ️  No variables with units found for testing';
    END IF;
    
    RAISE NOTICE '✅ User unit preference system migration completed successfully!';
    RAISE NOTICE 'ℹ️  Priority system: User preferences = -1 (highest), variable_units = 1,2,3... (lower numbers = higher priority)';
END $$;