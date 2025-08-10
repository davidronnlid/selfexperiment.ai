-- Fix missing units for Broccoli variable
-- This migration adds the missing mass units that were causing unit preference saves to fail

-- First, let's see what we're working with
DO $$
DECLARE
    variable_id_to_fix UUID := '3f123d63-4e35-418a-83ad-01055bf4d0f6';
    var_info RECORD;
BEGIN
    -- Get variable info
    SELECT id, slug, label, category INTO var_info 
    FROM variables 
    WHERE id = variable_id_to_fix;
    
    IF FOUND THEN
        RAISE NOTICE 'Fixing units for variable: % (%) - Category: %', 
            var_info.label, var_info.slug, var_info.category;
    ELSE
        RAISE NOTICE 'Variable % not found', variable_id_to_fix;
        RETURN;
    END IF;
    
    -- Check current units
    RAISE NOTICE 'Current units: %', (
        SELECT COALESCE(string_agg(unit_id || ':' || priority, ', '), 'NONE')
        FROM variable_units 
        WHERE variable_id = variable_id_to_fix
    );
END $$;

-- First, let's find the actual Broccoli variable
DO $$
DECLARE
    broccoli_var_id UUID;
BEGIN
    -- Try to find broccoli variable by label or slug
    SELECT id INTO broccoli_var_id
    FROM variables 
    WHERE LOWER(label) LIKE '%broccoli%' OR LOWER(slug) LIKE '%broccoli%'
    LIMIT 1;
    
    IF broccoli_var_id IS NOT NULL THEN
        RAISE NOTICE 'Found Broccoli variable: %', broccoli_var_id;
        
        -- Add missing mass units for the Broccoli variable (without created_at/updated_at)
        INSERT INTO variable_units (variable_id, unit_id, priority) VALUES 
        (broccoli_var_id, 'g', 1),
        (broccoli_var_id, 'kg', 2),
        (broccoli_var_id, 'oz', 3),
        (broccoli_var_id, 'lb', 4)
        ON CONFLICT (variable_id, unit_id) DO UPDATE SET 
            priority = EXCLUDED.priority;
            
        RAISE NOTICE 'Added mass units for Broccoli variable';
    ELSE
        RAISE NOTICE 'No Broccoli variable found, creating one for testing...';
        
        -- Create a test variable if none exists
        INSERT INTO variables (id, slug, label, category, data_type, source_type)
        VALUES (
            '3f123d63-4e35-418a-83ad-01055bf4d0f6'::UUID,
            'broccoli',
            'Broccoli',
            'mass',
            'continuous',
            'manual'
        )
        ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            label = EXCLUDED.label;
            
        -- Add mass units
        INSERT INTO variable_units (variable_id, unit_id, priority) VALUES 
        ('3f123d63-4e35-418a-83ad-01055bf4d0f6', 'g', 1),
        ('3f123d63-4e35-418a-83ad-01055bf4d0f6', 'kg', 2),
        ('3f123d63-4e35-418a-83ad-01055bf4d0f6', 'oz', 3),
        ('3f123d63-4e35-418a-83ad-01055bf4d0f6', 'lb', 4)
        ON CONFLICT (variable_id, unit_id) DO UPDATE SET 
            priority = EXCLUDED.priority;
            
        RAISE NOTICE 'Created Broccoli variable and added mass units';
    END IF;
END $$;

-- Verify the units were added successfully
DO $$
DECLARE
    broccoli_var_id UUID;
    rec RECORD;
BEGIN
    -- Find the broccoli variable again
    SELECT id INTO broccoli_var_id
    FROM variables 
    WHERE LOWER(label) LIKE '%broccoli%' OR LOWER(slug) LIKE '%broccoli%'
    LIMIT 1;
    
    IF broccoli_var_id IS NULL THEN
        broccoli_var_id := '3f123d63-4e35-418a-83ad-01055bf4d0f6'::UUID;
    END IF;
    
    RAISE NOTICE 'Units added successfully for Broccoli variable (%)::', broccoli_var_id;
    
    -- Show the units
    FOR rec IN 
        SELECT vu.unit_id, vu.priority, u.label, u.symbol, u.unit_group
        FROM variable_units vu 
        JOIN units u ON vu.unit_id = u.id 
        WHERE vu.variable_id = broccoli_var_id
        ORDER BY vu.priority
    LOOP
        RAISE NOTICE '  - % (%) - Priority: % - Group: %', 
            rec.label, rec.symbol, rec.priority, rec.unit_group;
    END LOOP;
END $$;

-- Test the set_user_unit_preference function now that units are available
DO $$
DECLARE
    test_result BOOLEAN;
    test_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Dummy user ID for testing
    broccoli_var_id UUID;
BEGIN
    -- Find the broccoli variable
    SELECT id INTO broccoli_var_id
    FROM variables 
    WHERE LOWER(label) LIKE '%broccoli%' OR LOWER(slug) LIKE '%broccoli%'
    LIMIT 1;
    
    IF broccoli_var_id IS NULL THEN
        broccoli_var_id := '3f123d63-4e35-418a-83ad-01055bf4d0f6'::UUID;
    END IF;

    RAISE NOTICE 'Testing set_user_unit_preference with kg for variable %...', broccoli_var_id;
    
    SELECT set_user_unit_preference(
        test_user_id, 
        broccoli_var_id, 
        'kg', 
        'mass'
    ) INTO test_result;
    
    IF test_result THEN
        RAISE NOTICE '✅ SUCCESS: set_user_unit_preference now works with kg!';
    ELSE
        RAISE NOTICE '❌ FAILED: set_user_unit_preference still returning false';
    END IF;
    
    -- Clean up test data
    DELETE FROM user_variable_preferences 
    WHERE user_id = test_user_id 
    AND variable_id = broccoli_var_id;
    
    RAISE NOTICE 'Test data cleaned up.';
END $$;
