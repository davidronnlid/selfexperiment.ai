-- Fix get_variable_units function to work with current database schema
-- The function should get units for a variable using the existing variable_units table structure

-- Drop the existing function
DROP FUNCTION IF EXISTS get_variable_units(UUID);

-- Create a simplified version that works with current schema
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
BEGIN
    -- Get units for this variable from variable_units table joined with units table
    RETURN QUERY
    SELECT 
        u.id as unit_id,
        u.label,
        u.symbol,
        u.unit_group,
        u.is_base,
        false as is_default_group  -- We'll determine this based on priority
    FROM variable_units vu
    JOIN units u ON vu.unit_id = u.id
    WHERE vu.variable_id = var_id
    ORDER BY 
        vu.priority ASC,  -- Lower priority number = higher preference
        u.is_base DESC,   -- Base units first
        u.label ASC;      -- Alphabetical order
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
    unit_record RECORD;
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
        FOR unit_record IN 
            SELECT unit_id, label, symbol, unit_group, is_base
            FROM get_variable_units(test_var_id)
            LIMIT 5
        LOOP
            RAISE NOTICE 'Unit: % (%) - % (base: %)', 
                unit_record.label, 
                unit_record.symbol, 
                unit_record.unit_group,
                unit_record.is_base;
        END LOOP;
    ELSE
        RAISE NOTICE 'No variables with units configured found to test with';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing function: %', SQLERRM;
END $$;
