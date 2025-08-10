-- Fix Subjective cognitive control variable to be boolean with proper units

-- Step 1: Check current state of the variable
SELECT 'Current Subjective cognitive control variable:' as info;
SELECT id, slug, label, data_type, source_type, is_active
FROM variables 
WHERE label ILIKE '%subjective%cognitive%control%' OR slug ILIKE '%subjective%cognitive%control%';

-- Step 2: Ensure boolean units exist in the units table
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('true/false', 'True/False', 'T/F', 'boolean', NULL, NULL, true),
('yes/no', 'Yes/No', 'Y/N', 'boolean', 'true/false', 1, false),
('0/1', 'Zero/One', '0/1', 'boolean', 'true/false', 1, false)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base;

-- Step 3: Update the variable to be boolean type
DO $$
DECLARE
    subjective_var_id UUID;
BEGIN
    -- Find the Subjective cognitive control variable
    SELECT id INTO subjective_var_id 
    FROM variables 
    WHERE label ILIKE '%subjective%cognitive%control%' 
    LIMIT 1;
    
    IF subjective_var_id IS NOT NULL THEN
        RAISE NOTICE 'Found Subjective cognitive control variable: %', subjective_var_id;
        
        -- Update the variable to be boolean
        UPDATE variables 
        SET 
            data_type = 'boolean'
        WHERE id = subjective_var_id;
        
        RAISE NOTICE 'Updated variable to boolean type';
        
        -- Remove any existing variable_units entries for this variable
        DELETE FROM variable_units WHERE variable_id = subjective_var_id;
        
        -- Add proper boolean units to variable_units table
        INSERT INTO variable_units (variable_id, unit_id, priority, note) VALUES
        (subjective_var_id, 'true/false', 1, 'Base boolean unit'),
        (subjective_var_id, 'yes/no', 2, 'User-friendly boolean'),
        (subjective_var_id, '0/1', 3, 'Numeric boolean');
        
        RAISE NOTICE 'Added boolean units to variable_units table';
        
    ELSE
        RAISE NOTICE 'Subjective cognitive control variable not found';
    END IF;
END $$;

-- Step 4: Check and update existing data points
DO $$
DECLARE
    subjective_var_id UUID;
    data_point_record RECORD;
    converted_value TEXT;
BEGIN
    -- Find the variable again
    SELECT id INTO subjective_var_id 
    FROM variables 
    WHERE label ILIKE '%subjective%cognitive%control%' 
    LIMIT 1;
    
    IF subjective_var_id IS NOT NULL THEN
        RAISE NOTICE 'Found % data points for Subjective cognitive control', (
            SELECT COUNT(*) FROM data_points WHERE variable_id = subjective_var_id
        );
        
        -- Update data points to use boolean values and units
        FOR data_point_record IN 
            SELECT id, value, display_unit 
            FROM data_points 
            WHERE variable_id = subjective_var_id
        LOOP
            -- Convert value to boolean (handle both text and numeric values)
            BEGIN
                -- Try to parse as number first
                IF data_point_record.value::numeric > 0 THEN
                    converted_value := 'true';
                ELSE
                    converted_value := 'false';
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Not a number, try text parsing
                    IF LOWER(TRIM(data_point_record.value)) IN ('true', 't', 'yes', 'y', '1', 'on', 'enabled') THEN
                        converted_value := 'true';
                    ELSE
                        converted_value := 'false';
                    END IF;
            END;
            
            -- Update the data point
            UPDATE data_points 
            SET 
                value = converted_value,
                display_unit = 'true/false'
            WHERE id = data_point_record.id;
            
            RAISE NOTICE 'Updated data point % from % to %', 
                data_point_record.id, 
                data_point_record.value, 
                converted_value;
        END LOOP;
        
    END IF;
END $$;

-- Step 5: Verify the changes
SELECT 'Updated Subjective cognitive control variable:' as info;
SELECT v.id, v.slug, v.label, v.data_type
FROM variables v
WHERE v.label ILIKE '%subjective%cognitive%control%';

SELECT 'Boolean units for the variable:' as info;
SELECT vu.variable_id, vu.unit_id, vu.priority, u.label, u.symbol
FROM variable_units vu
JOIN units u ON vu.unit_id = u.id
JOIN variables v ON vu.variable_id = v.id
WHERE v.label ILIKE '%subjective%cognitive%control%'
ORDER BY vu.priority;

SELECT 'Sample updated data points:' as info;
SELECT dp.id, dp.value, dp.display_unit, dp.created_at
FROM data_points dp
JOIN variables v ON dp.variable_id = v.id
WHERE v.label ILIKE '%subjective%cognitive%control%'
ORDER BY dp.created_at DESC
LIMIT 5;
