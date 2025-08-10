-- Fix get_variable_units function with proper security and schema settings
-- The function exists but has security/permission issues preventing it from accessing tables

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_variable_units(UUID);

-- Recreate with proper security settings
CREATE OR REPLACE FUNCTION get_variable_units(var_id UUID)
RETURNS TABLE(
    unit_id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT,
    is_base BOOLEAN,
    is_default_group BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- If no configuration found, return units directly linked in variable_units table
    RETURN QUERY
    SELECT 
        u.id,
        u.label,
        u.symbol,
        u.unit_group,
        u.is_base,
        true as is_default_group
    FROM units u
    JOIN variable_units vu ON u.id = vu.unit_id
    WHERE vu.variable_id = var_id
    ORDER BY 
        vu.priority ASC,
        u.is_base DESC,
        u.label;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION get_variable_units(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_variable_units(UUID) TO anon;

-- Test the function with a known variable
DO $$
DECLARE
    test_var_id UUID;
    result_count INTEGER;
BEGIN
    -- Get the first variable that has units configured
    SELECT DISTINCT vu.variable_id INTO test_var_id 
    FROM variable_units vu
    LIMIT 1;
    
    IF test_var_id IS NOT NULL THEN
        RAISE NOTICE 'Testing get_variable_units with variable ID: %', test_var_id;
        
        -- Test the function
        SELECT COUNT(*) INTO result_count
        FROM get_variable_units(test_var_id);
        
        RAISE NOTICE 'Function returned % units for variable %', result_count, test_var_id;
        
        -- Show sample results
        DECLARE
            unit_record RECORD;
        BEGIN
            FOR unit_record IN 
                SELECT unit_id, label, symbol, unit_group, is_base, is_default_group
                FROM get_variable_units(test_var_id)
                LIMIT 3
            LOOP
                RAISE NOTICE 'Unit: % (%) - %', unit_record.label, unit_record.symbol, unit_record.unit_group;
            END LOOP;
        END;
    ELSE
        RAISE NOTICE 'No variables with units configured found to test with';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing function: %', SQLERRM;
END $$;
