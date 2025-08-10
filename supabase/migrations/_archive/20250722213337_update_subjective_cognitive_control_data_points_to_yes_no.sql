-- Update Subjective cognitive control data points from true/false to yes/no
-- Manually change all saved data points as requested

-- Step 1: Verify current state of Subjective cognitive control data points
SELECT 'Current Subjective cognitive control data points:' as info;
SELECT 
    dp.id,
    dp.value,
    dp.display_unit,
    dp.created_at,
    v.label as variable_label
FROM data_points dp
JOIN variables v ON dp.variable_id = v.id
WHERE v.label ILIKE '%subjective%cognitive%control%'
ORDER BY dp.created_at DESC
LIMIT 10;

-- Step 2: Update all data points for Subjective cognitive control variable
DO $$
DECLARE
    cognitive_control_var_id UUID;
    data_point_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- Find the Subjective cognitive control variable
    SELECT id INTO cognitive_control_var_id
    FROM variables 
    WHERE label ILIKE '%subjective%cognitive%control%'
    LIMIT 1;
    
    IF cognitive_control_var_id IS NULL THEN
        RAISE NOTICE 'Subjective cognitive control variable not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Subjective cognitive control variable: %', cognitive_control_var_id;
    
    -- Update all data points for this variable
    FOR data_point_record IN 
        SELECT id, value, display_unit
        FROM data_points 
        WHERE variable_id = cognitive_control_var_id
    LOOP
        -- Convert true/false to yes/no
        IF LOWER(TRIM(data_point_record.value)) IN ('true', 't', '1') THEN
            UPDATE data_points 
            SET 
                value = 'yes',
                display_unit = 'yes/no'
            WHERE id = data_point_record.id;
            
            updated_count := updated_count + 1;
            RAISE NOTICE 'Updated data point % from "%" to "yes"', 
                data_point_record.id, data_point_record.value;
                
        ELSIF LOWER(TRIM(data_point_record.value)) IN ('false', 'f', '0') THEN
            UPDATE data_points 
            SET 
                value = 'no',
                display_unit = 'yes/no'
            WHERE id = data_point_record.id;
            
            updated_count := updated_count + 1;
            RAISE NOTICE 'Updated data point % from "%" to "no"', 
                data_point_record.id, data_point_record.value;
                
        ELSE
            RAISE NOTICE 'Skipped data point % with unexpected value: "%"', 
                data_point_record.id, data_point_record.value;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully updated % data points for Subjective cognitive control', updated_count;
END $$;

-- Step 3: Verify the updates
SELECT 'Updated Subjective cognitive control data points:' as info;
SELECT 
    dp.id,
    dp.value,
    dp.display_unit,
    dp.created_at,
    v.label as variable_label,
    COUNT(*) OVER() as total_count
FROM data_points dp
JOIN variables v ON dp.variable_id = v.id
WHERE v.label ILIKE '%subjective%cognitive%control%'
ORDER BY dp.created_at DESC;

-- Step 4: Show summary statistics
SELECT 'Summary of Subjective cognitive control data points:' as info;
SELECT 
    dp.value,
    dp.display_unit,
    COUNT(*) as count
FROM data_points dp
JOIN variables v ON dp.variable_id = v.id
WHERE v.label ILIKE '%subjective%cognitive%control%'
GROUP BY dp.value, dp.display_unit
ORDER BY dp.value;

SELECT '✅ Successfully updated all Subjective cognitive control data points to yes/no format!' as result;
