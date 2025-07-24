-- Fix boolean units structure for proper boolean variable support

-- Step 1: Ensure boolean units exist with proper structure
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
-- True/False as base unit
('true/false', 'True/False', 'T/F', 'boolean', NULL, NULL, true),
-- Yes/No convertible to True/False
('yes/no', 'Yes/No', 'Y/N', 'boolean', 'true/false', 1, false),
-- 0/1 convertible to True/False  
('0/1', 'Zero/One', '0/1', 'boolean', 'true/false', 1, false)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base;

-- Step 2: Find boolean variables that need unit configuration
DO $$
DECLARE
    boolean_var RECORD;
    unit_priority INTEGER;
BEGIN
    -- Loop through variables that should be boolean but might not have proper units
    FOR boolean_var IN 
        SELECT id, label, slug, data_type
        FROM variables 
        WHERE (
            label ILIKE '%subjective%cognitive%control%' OR
            label ILIKE '%try%' OR
            data_type = 'boolean' OR
            label IN (
                'Exercise', 'Illness/Symptoms', 'Big Meal Late', 'Late Sugar Intake',
                'Intermittent Fasting', 'Noise Disturbances', 'Travel/Jet Lag',
                'Altitude Change', 'Emotional Event', 'Naps'
            )
        )
        AND is_active = true
    LOOP
        RAISE NOTICE 'Processing boolean variable: % (ID: %)', boolean_var.label, boolean_var.id;
        
        -- Update variable to be boolean type
        UPDATE variables 
        SET data_type = 'boolean'
        WHERE id = boolean_var.id;
        
        -- Remove existing variable_units entries for this variable
        DELETE FROM variable_units WHERE variable_id = boolean_var.id;
        
        -- Add boolean units to variable_units table with proper priority
        unit_priority := 1;
        
        -- Add True/False as priority 1 (base unit)
        INSERT INTO variable_units (variable_id, unit_id, priority, note) VALUES
        (boolean_var.id, 'true/false', unit_priority, 'Base boolean unit');
        unit_priority := unit_priority + 1;
        
        -- Add Yes/No as priority 2
        INSERT INTO variable_units (variable_id, unit_id, priority, note) VALUES
        (boolean_var.id, 'yes/no', unit_priority, 'User-friendly boolean');
        unit_priority := unit_priority + 1;
        
        -- Add 0/1 as priority 3
        INSERT INTO variable_units (variable_id, unit_id, priority, note) VALUES
        (boolean_var.id, '0/1', unit_priority, 'Numeric boolean');
        
        RAISE NOTICE 'Added boolean units for variable: %', boolean_var.label;
    END LOOP;
END $$;

-- Step 3: Update any existing data points for boolean variables to use proper boolean values
DO $$
DECLARE
    data_point_record RECORD;
    converted_value TEXT;
    target_unit TEXT;
BEGIN
    -- Update data points for boolean variables
    FOR data_point_record IN 
        SELECT dp.id, dp.value, dp.display_unit, dp.variable_id, v.label as variable_label
        FROM data_points dp
        JOIN variables v ON dp.variable_id = v.id
        WHERE v.data_type = 'boolean'
    LOOP
        -- Determine the target unit (default to true/false if not set)
        target_unit := COALESCE(data_point_record.display_unit, 'true/false');
        
        -- Convert value based on current value
        IF data_point_record.value IS NOT NULL THEN
            -- Try to parse as number first
            BEGIN
                IF data_point_record.value::numeric > 0 THEN
                    -- Positive number = true
                    CASE target_unit
                        WHEN 'yes/no' THEN converted_value := 'yes';
                        WHEN '0/1' THEN converted_value := '1';
                        ELSE converted_value := 'true';
                    END CASE;
                ELSE
                    -- Zero or negative = false
                    CASE target_unit
                        WHEN 'yes/no' THEN converted_value := 'no';
                        WHEN '0/1' THEN converted_value := '0';
                        ELSE converted_value := 'false';
                    END CASE;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Not a number, try text parsing
                    IF LOWER(data_point_record.value) IN ('true', 't', 'yes', 'y', '1', 'on', 'enabled') THEN
                        CASE target_unit
                            WHEN 'yes/no' THEN converted_value := 'yes';
                            WHEN '0/1' THEN converted_value := '1';
                            ELSE converted_value := 'true';
                        END CASE;
                    ELSE
                        CASE target_unit
                            WHEN 'yes/no' THEN converted_value := 'no';
                            WHEN '0/1' THEN converted_value := '0';
                            ELSE converted_value := 'false';
                        END CASE;
                    END IF;
            END;
            
            -- Update the data point
            UPDATE data_points 
            SET 
                value = converted_value,
                display_unit = target_unit
            WHERE id = data_point_record.id;
            
            RAISE NOTICE 'Updated data point for %: % -> % (%)', 
                data_point_record.variable_label,
                data_point_record.value, 
                converted_value,
                target_unit;
        END IF;
    END LOOP;
END $$;

-- Step 4: Verify the changes
SELECT 'Boolean variables updated:' as info;
SELECT v.id, v.label, v.data_type, COUNT(vu.unit_id) as unit_count
FROM variables v
LEFT JOIN variable_units vu ON v.id = vu.variable_id
WHERE v.data_type = 'boolean' AND v.is_active = true
GROUP BY v.id, v.label, v.data_type
ORDER BY v.label;

SELECT 'Boolean units available:' as info;
SELECT u.id, u.label, u.symbol, u.unit_group, u.is_base
FROM units u
WHERE u.unit_group = 'boolean'
ORDER BY u.is_base DESC, u.label;
