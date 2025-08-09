-- Debug script for broccoli variable units
-- Run this in your Supabase SQL Editor to check and fix unit configuration

-- Step 1: Check current broccoli variable configuration
SELECT 'Current broccoli variable:' as info;
SELECT id, slug, label, canonical_unit, unit_group, convertible_units, default_display_unit
FROM variables 
WHERE slug = 'broccoli' OR label ILIKE '%broccoli%';

-- Step 2: Check what units are currently linked to broccoli variable
SELECT 'Current variable_units for broccoli:' as info;
SELECT vu.*, u.label as unit_label, u.symbol, u.unit_group
FROM variable_units vu
JOIN units u ON vu.unit_id = u.id
JOIN variables v ON vu.variable_id = v.id
WHERE v.slug = 'broccoli' OR v.label ILIKE '%broccoli%'
ORDER BY vu.priority;

-- Step 3: Check available mass units in the system
SELECT 'Available mass units:' as info;
SELECT id, label, symbol, unit_group, is_base
FROM units 
WHERE unit_group = 'mass'
ORDER BY is_base DESC, label;

-- Step 4: Fix broccoli variable units if missing
DO $$
DECLARE
    broccoli_var_id UUID;
    unit_exists BOOLEAN;
BEGIN
    -- Get broccoli variable ID
    SELECT id INTO broccoli_var_id 
    FROM variables 
    WHERE slug = 'broccoli' 
    LIMIT 1;
    
    IF broccoli_var_id IS NULL THEN
        RAISE NOTICE 'Broccoli variable not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found broccoli variable: %', broccoli_var_id;
    
    -- Check if kg unit exists for broccoli
    SELECT EXISTS(
        SELECT 1 FROM variable_units 
        WHERE variable_id = broccoli_var_id AND unit_id = 'kg'
    ) INTO unit_exists;
    
    IF NOT unit_exists THEN
        RAISE NOTICE 'Adding kg unit to broccoli variable';
        INSERT INTO variable_units (variable_id, unit_id, priority, note)
        VALUES (broccoli_var_id, 'kg', 2, 'Kilograms - metric mass unit')
        ON CONFLICT (variable_id, unit_id) DO NOTHING;
    ELSE
        RAISE NOTICE 'kg unit already exists for broccoli';
    END IF;
    
    -- Also ensure g, lb, oz units exist
    INSERT INTO variable_units (variable_id, unit_id, priority, note) VALUES
    (broccoli_var_id, 'g', 1, 'Grams - base mass unit'),
    (broccoli_var_id, 'kg', 2, 'Kilograms - metric mass unit'),
    (broccoli_var_id, 'lb', 3, 'Pounds - imperial mass unit'),
    (broccoli_var_id, 'oz', 4, 'Ounces - imperial mass unit')
    ON CONFLICT (variable_id, unit_id) DO NOTHING;
    
    RAISE NOTICE 'Added mass units to broccoli variable';
END $$;

-- Step 5: Verify the fix
SELECT 'Broccoli units after fix:' as info;
SELECT vu.unit_id, u.label, u.symbol, vu.priority, vu.note
FROM variable_units vu
JOIN units u ON vu.unit_id = u.id
JOIN variables v ON vu.variable_id = v.id
WHERE v.slug = 'broccoli'
ORDER BY vu.priority;

-- Step 6: Test the functions
DO $$
DECLARE
    broccoli_var_id UUID;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    SELECT id INTO broccoli_var_id FROM variables WHERE slug = 'broccoli' LIMIT 1;
    
    IF broccoli_var_id IS NOT NULL THEN
        RAISE NOTICE 'Testing get_variable_units for broccoli:';
        -- This would show the units available
        PERFORM * FROM get_variable_units(broccoli_var_id);
        
        RAISE NOTICE 'Testing set_user_unit_preference for kg:';
        -- Test if we can set kg as preference
        PERFORM set_user_unit_preference(test_user_id, broccoli_var_id, 'kg', 'mass');
    END IF;
END $$;