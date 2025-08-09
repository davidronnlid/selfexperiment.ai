-- Debug why kg unit preference isn't working for broccoli
-- Run this in Supabase SQL Editor

-- Step 1: Get the broccoli variable ID
SELECT 'Broccoli variable info:' as info;
SELECT id, slug, label FROM variables WHERE slug = 'broccoli' OR label ILIKE '%broccoli%';

-- Step 2: Check what units are actually configured for broccoli
SELECT 'Units configured for broccoli:' as info;
SELECT 
    vu.variable_id,
    vu.unit_id,
    vu.priority,
    u.label,
    u.symbol,
    u.unit_group
FROM variable_units vu
JOIN units u ON vu.unit_id = u.id
JOIN variables v ON vu.variable_id = v.id
WHERE v.slug = 'broccoli'
ORDER BY vu.priority;

-- Step 3: Check if kg unit exists in units table
SELECT 'kg unit info:' as info;
SELECT id, label, symbol, unit_group FROM units WHERE id = 'kg';

-- Step 4: Test the set_user_unit_preference function directly
DO $$
DECLARE
    broccoli_var_id UUID;
    test_user_id UUID := 'bb0ac2ff-72c5-4776-a83a-01855bff4df0'; -- Your actual user ID from the logs
    result BOOLEAN;
BEGIN
    -- Get broccoli variable ID
    SELECT id INTO broccoli_var_id FROM variables WHERE slug = 'broccoli' LIMIT 1;
    
    RAISE NOTICE 'Testing with broccoli_var_id: %, user_id: %', broccoli_var_id, test_user_id;
    
    -- Test the function
    SELECT set_user_unit_preference(test_user_id, broccoli_var_id, 'kg', 'mass') INTO result;
    
    RAISE NOTICE 'Function result: %', result;
    
    IF result THEN
        RAISE NOTICE '✅ SUCCESS: kg preference saved';
        
        -- Check what was actually saved
        SELECT 'Saved preference:' as info;
        SELECT user_id, variable_id, display_unit, is_shared 
        FROM user_variable_preferences 
        WHERE user_id = test_user_id AND variable_id = broccoli_var_id;
    ELSE
        RAISE NOTICE '❌ FAILED: Could not save kg preference';
        
        -- Check what units are available for this variable
        RAISE NOTICE 'Available units for broccoli: %', (
            SELECT string_agg(unit_id, ', ')
            FROM variable_units
            WHERE variable_id = broccoli_var_id
        );
    END IF;
END $$;