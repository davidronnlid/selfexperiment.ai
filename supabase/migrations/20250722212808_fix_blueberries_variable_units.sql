-- Fix blueberries variable units configuration
-- Ensure blueberries variable has proper mass units available

-- Step 1: Check current state of blueberries variable
SELECT 'Current blueberries variable configuration:' as info;
SELECT v.id, v.slug, v.label, v.data_type
FROM variables v
WHERE v.slug = 'blueberries' OR v.label ILIKE '%blueberries%';

-- Step 2: Ensure all mass units exist in units table
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('mg', 'Milligrams', 'mg', 'mass', 'kg', 0.000001, false),
('g', 'Grams', 'g', 'mass', 'kg', 0.001, false),
('kg', 'Kilograms', 'kg', 'mass', NULL, NULL, true),
('oz', 'Ounces', 'oz', 'mass', 'kg', 0.0283495, false),
('lb', 'Pounds', 'lb', 'mass', 'kg', 0.453592, false)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base;

-- Step 3: Add mass units to blueberries variable in variable_units table
DO $$
DECLARE
    blueberries_var_id UUID;
    unit_record RECORD;
    priority_counter INTEGER := 1;
BEGIN
    -- Find the blueberries variable
    SELECT id INTO blueberries_var_id
    FROM variables 
    WHERE slug = 'blueberries' OR label ILIKE '%blueberries%'
    LIMIT 1;
    
    IF blueberries_var_id IS NULL THEN
        RAISE NOTICE 'Blueberries variable not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found blueberries variable: %', blueberries_var_id;
    
    -- Remove existing variable_units entries for this variable to start fresh
    DELETE FROM variable_units WHERE variable_id = blueberries_var_id;
    
    -- Add all mass units for blueberries variable
    FOR unit_record IN 
        SELECT id, label 
        FROM units 
        WHERE unit_group = 'mass' 
        ORDER BY 
            CASE id 
                WHEN 'g' THEN 1    -- g first (most common for blueberries)
                WHEN 'kg' THEN 2   -- kg second
                WHEN 'mg' THEN 3   -- mg third
                WHEN 'oz' THEN 4   -- oz fourth
                WHEN 'lb' THEN 5   -- lb last
                ELSE 6
            END
    LOOP
        INSERT INTO variable_units (variable_id, unit_id, priority, note) VALUES
        (blueberries_var_id, unit_record.id, priority_counter, 
         'Mass unit for blueberries: ' || unit_record.label);
        
        RAISE NOTICE 'Added unit % (%) to blueberries variable', 
            unit_record.id, unit_record.label;
        
        priority_counter := priority_counter + 1;
    END LOOP;
    
    -- Update the variable data type to continuous if it isn't already
    UPDATE variables 
    SET data_type = 'continuous'
    WHERE id = blueberries_var_id AND data_type != 'continuous';
    
    RAISE NOTICE 'Successfully configured blueberries variable with mass units';
END $$;

-- Step 4: Verify the configuration
SELECT 'Blueberries variable units configuration:' as info;
SELECT 
    v.slug,
    v.label as variable_label,
    v.data_type,
    vu.unit_id,
    u.label as unit_label,
    u.symbol,
    u.unit_group,
    vu.priority
FROM variables v
JOIN variable_units vu ON v.id = vu.variable_id
JOIN units u ON vu.unit_id = u.id
WHERE v.slug = 'blueberries' OR v.label ILIKE '%blueberries%'
ORDER BY vu.priority;

-- Step 5: Test the get_variable_units function
SELECT 'Testing get_variable_units function for blueberries:' as info;
SELECT * FROM get_variable_units(
    (SELECT id FROM variables WHERE slug = 'blueberries' OR label ILIKE '%blueberries%' LIMIT 1)
);
