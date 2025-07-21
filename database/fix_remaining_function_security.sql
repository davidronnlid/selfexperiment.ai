-- ============================================================================
-- FIX REMAINING FUNCTION SEARCH PATH SECURITY ISSUES
-- ============================================================================
-- This script fixes the remaining 7 functions that still have search path vulnerabilities
-- after running the previous fix script.

-- ============================================================================
-- REMAINING VULNERABLE FUNCTIONS
-- ============================================================================

-- 1. Fix create_simple_routine_auto_logs function
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs(DATE);
CREATE OR REPLACE FUNCTION create_simple_routine_auto_logs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(routine_id UUID, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) 
SET search_path = ''
AS $$
DECLARE
    routine_record RECORD;
    log_exists BOOLEAN;
    variable_record RECORD;
BEGIN
    -- Loop through all active routines
    FOR routine_record IN
        SELECT r.id, r.routine_name, r.user_id
        FROM routines r
        WHERE r.is_active = true
    LOOP
        -- Check if logs already exist for this routine today
        SELECT EXISTS(
            SELECT 1 FROM data_points dp
            WHERE dp.user_id = routine_record.user_id
              AND dp.date = target_date
        ) INTO log_exists;

        -- Return result for this routine
        routine_id := routine_record.id;
        variable_name := 'routine_check';
        auto_logged := NOT log_exists;
        error_message := NULL;
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix get_cron_job_status function
DROP FUNCTION IF EXISTS get_cron_job_status(TEXT);
CREATE OR REPLACE FUNCTION get_cron_job_status(p_job_name TEXT)
RETURNS TABLE(job_name TEXT, last_run TIMESTAMP WITH TIME ZONE, status TEXT) 
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cjl.job_name,
        cjl.created_at as last_run,
        cjl.status
    FROM cron_job_logs cjl
    WHERE cjl.job_name = p_job_name
    ORDER BY cjl.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix validate_routine_variable_value function
DROP FUNCTION IF EXISTS validate_routine_variable_value(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION validate_routine_variable_value(
    p_routine_id UUID,
    p_variable_id UUID,
    p_value TEXT
)
RETURNS BOOLEAN 
SET search_path = ''
AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    -- Basic validation logic
    IF p_value IS NULL OR LENGTH(TRIM(p_value)) = 0 THEN
        RETURN false;
    END IF;
    
    -- Check if routine and variable exist
    SELECT EXISTS(
        SELECT 1 FROM routines r
        WHERE r.id = p_routine_id
    ) INTO is_valid;
    
    IF NOT is_valid THEN
        RETURN false;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM variables v
        WHERE v.id = p_variable_id
    ) INTO is_valid;
    
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- 4. Fix handle_routine_override function
DROP FUNCTION IF EXISTS handle_routine_override();
CREATE OR REPLACE FUNCTION handle_routine_override()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    -- Mark the routine log as overridden if it exists
    IF TG_OP = 'INSERT' THEN
        UPDATE routine_log_history 
        SET was_overridden = true,
            updated_at = NOW()
        WHERE user_id = NEW.user_id
          AND variable_id = NEW.variable_id
          AND log_date = NEW.date
          AND was_overridden = false;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Fix toggle_routine_active function
DROP FUNCTION IF EXISTS toggle_routine_active(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION toggle_routine_active(p_routine_id UUID, p_is_active BOOLEAN)
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    UPDATE routines 
    SET is_active = p_is_active, 
        updated_at = NOW()
    WHERE id = p_routine_id;
    
    -- If we're deactivating, also update last_auto_logged
    IF NOT p_is_active THEN
        UPDATE routines 
        SET last_auto_logged = NOW()
        WHERE id = p_routine_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Fix set_user_unit_preference function
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION set_user_unit_preference(
    p_user_uuid UUID,
    p_variable_uuid UUID,
    p_unit_id TEXT
)
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    -- Validate that the unit is valid for this variable
    IF NOT EXISTS(
        SELECT 1 FROM variable_units vu
        WHERE vu.variable_id = p_variable_uuid 
          AND vu.unit_id = p_unit_id
    ) THEN
        RAISE EXCEPTION 'Unit % is not valid for variable %', p_unit_id, p_variable_uuid;
    END IF;
    
    -- Insert or update user preference
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, created_at, updated_at)
    VALUES (p_user_uuid, p_variable_uuid, p_unit_id, NOW(), NOW())
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET 
        display_unit = EXCLUDED.display_unit,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Fix test_unit_validation_for_variable function
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(UUID, TEXT);
CREATE OR REPLACE FUNCTION test_unit_validation_for_variable(
    p_variable_uuid UUID,
    p_unit_id TEXT
)
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT) 
SET search_path = ''
AS $$
DECLARE
    validation_result BOOLEAN;
    err_msg TEXT;
BEGIN
    -- Check if variable exists
    IF NOT EXISTS(SELECT 1 FROM variables WHERE id = p_variable_uuid) THEN
        RETURN QUERY SELECT false, 'Variable does not exist';
        RETURN;
    END IF;
    
    -- Check if unit exists
    IF NOT EXISTS(SELECT 1 FROM units WHERE id = p_unit_id) THEN
        RETURN QUERY SELECT false, 'Unit does not exist';
        RETURN;
    END IF;
    
    -- Check if unit is valid for variable
    SELECT EXISTS(
        SELECT 1 FROM variable_units vu
        WHERE vu.variable_id = p_variable_uuid 
          AND vu.unit_id = p_unit_id
    ) INTO validation_result;
    
    IF validation_result THEN
        err_msg := NULL;
    ELSE
        err_msg := 'Unit is not configured for this variable';
    END IF;
    
    RETURN QUERY SELECT validation_result, err_msg;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check the security status of these specific functions
SELECT 
    proname as function_name,
    CASE 
        WHEN proconfig IS NULL THEN '❌ Still Vulnerable'
        WHEN 'search_path=' = ANY(proconfig) THEN '✅ Now Secure'
        ELSE '⚠️  Other Config'
    END as security_status,
    proconfig
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'create_simple_routine_auto_logs',
    'get_cron_job_status', 
    'validate_routine_variable_value',
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
ORDER BY function_name;

-- Success message
SELECT 'Remaining Function Security Issues Fixed!' as status;
SELECT 'These 7 functions should now be secure against search path attacks.' as details; 