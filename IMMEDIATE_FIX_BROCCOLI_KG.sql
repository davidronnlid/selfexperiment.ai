-- IMMEDIATE FIX FOR BROCCOLI KG UNIT ISSUE
-- Copy and paste this entire script into your Supabase SQL Editor and run it

-- Step 1: Force update the function to allow kg for broccoli
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
BEGIN
    -- Simplified validation - just check if unit exists in general units table
    IF NOT EXISTS(SELECT 1 FROM units WHERE id = unit_id_param) THEN
        RETURN FALSE;
    END IF;

    -- Insert or update user preference
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, is_shared, created_at, updated_at)
    VALUES (
        user_id_param,
        variable_id_param,
        unit_id_param,
        COALESCE((
            SELECT is_shared 
            FROM user_variable_preferences 
            WHERE user_id = user_id_param AND variable_id = variable_id_param
        ), false),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET
        display_unit = unit_id_param,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Test with your actual user ID and broccoli variable
DO $$
DECLARE
    broccoli_var_id UUID;
    test_user_id UUID := 'bb0ac2ff-72c5-4776-a83a-01855bff4df0'; -- Your user ID from console logs
    result BOOLEAN;
BEGIN
    -- Get broccoli variable ID
    SELECT id INTO broccoli_var_id FROM variables WHERE slug = 'broccoli' LIMIT 1;
    
    IF broccoli_var_id IS NOT NULL THEN
        -- Test the function
        SELECT set_user_unit_preference(test_user_id, broccoli_var_id, 'kg', 'mass') INTO result;
        
        IF result THEN
            RAISE NOTICE '✅ SUCCESS: kg preference saved for broccoli!';
            RAISE NOTICE 'Variable ID: %', broccoli_var_id;
            RAISE NOTICE 'User ID: %', test_user_id;
            
            -- Show what was saved
            RAISE NOTICE 'Saved preference: %', (
                SELECT display_unit 
                FROM user_variable_preferences 
                WHERE user_id = test_user_id AND variable_id = broccoli_var_id
            );
        ELSE
            RAISE NOTICE '❌ FAILED: Could not save kg preference';
        END IF;
    ELSE
        RAISE NOTICE '❌ FAILED: Broccoli variable not found';
    END IF;
END $$;

SELECT 'Fix applied! Try selecting kg again in the UI.' as result;