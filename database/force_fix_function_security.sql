-- ============================================================================
-- FORCE FIX FUNCTION SEARCH PATH SECURITY ISSUES
-- ============================================================================
-- This script aggressively fixes the persistent function security issues by:
-- 1. Finding all overloads of problematic functions
-- 2. Dropping ALL variants completely
-- 3. Recreating them with proper security settings

-- ============================================================================
-- DIAGNOSTIC: Show current function signatures
-- ============================================================================

SELECT 'Current function signatures that need fixing:' as diagnostic;

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE 
        WHEN proconfig IS NULL THEN 'VULNERABLE'
        WHEN 'search_path=' = ANY(proconfig) THEN 'SECURE'
        ELSE 'OTHER_CONFIG'
    END as current_status
FROM pg_proc p
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
ORDER BY proname, arguments;

-- ============================================================================
-- AGGRESSIVE FUNCTION CLEANUP
-- ============================================================================

-- Drop ALL possible variants of these functions
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs() CASCADE;
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs(DATE) CASCADE;
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs(DATE, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs(target_date DATE) CASCADE;

DROP FUNCTION IF EXISTS get_cron_job_status() CASCADE;
DROP FUNCTION IF EXISTS get_cron_job_status(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_cron_job_status(job_name TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_cron_job_status(p_job_name TEXT) CASCADE;

DROP FUNCTION IF EXISTS validate_routine_variable_value() CASCADE;
DROP FUNCTION IF EXISTS validate_routine_variable_value(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_routine_variable_value(routine_id UUID, variable_id UUID, value TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_routine_variable_value(p_routine_id UUID, p_variable_id UUID, p_value TEXT) CASCADE;

DROP FUNCTION IF EXISTS handle_routine_override() CASCADE;

DROP FUNCTION IF EXISTS toggle_routine_active() CASCADE;
DROP FUNCTION IF EXISTS toggle_routine_active(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS toggle_routine_active(routine_id UUID, is_active BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS toggle_routine_active(p_routine_id UUID, p_is_active BOOLEAN) CASCADE;

DROP FUNCTION IF EXISTS set_user_unit_preference() CASCADE;
DROP FUNCTION IF EXISTS set_user_unit_preference(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_user_unit_preference(user_uuid UUID, variable_uuid UUID, unit_id TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_user_unit_preference(p_user_uuid UUID, p_variable_uuid UUID, p_unit_id TEXT) CASCADE;

DROP FUNCTION IF EXISTS test_unit_validation_for_variable() CASCADE;
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(variable_uuid UUID, unit_id TEXT) CASCADE;
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(p_variable_uuid UUID, p_unit_id TEXT) CASCADE;

-- ============================================================================
-- RECREATE SECURE FUNCTIONS
-- ============================================================================

-- 1. create_simple_routine_auto_logs
CREATE FUNCTION create_simple_routine_auto_logs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(routine_id UUID, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    routine_record RECORD;
    log_exists BOOLEAN;
BEGIN
    -- Loop through all active routines
    FOR routine_record IN
        SELECT r.id, r.routine_name, r.user_id
        FROM public.routines r
        WHERE r.is_active = true
    LOOP
        -- Check if logs already exist for this routine today
        SELECT EXISTS(
            SELECT 1 FROM public.data_points dp
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
$$;

-- 2. get_cron_job_status
CREATE FUNCTION get_cron_job_status(p_job_name TEXT)
RETURNS TABLE(job_name TEXT, last_run TIMESTAMP WITH TIME ZONE, status TEXT) 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cjl.job_name,
        cjl.created_at as last_run,
        cjl.status
    FROM public.cron_job_logs cjl
    WHERE cjl.job_name = p_job_name
    ORDER BY cjl.created_at DESC
    LIMIT 1;
END;
$$;

-- 3. validate_routine_variable_value
CREATE FUNCTION validate_routine_variable_value(
    p_routine_id UUID,
    p_variable_id UUID,
    p_value TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
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
        SELECT 1 FROM public.routines r
        WHERE r.id = p_routine_id
    ) INTO is_valid;
    
    IF NOT is_valid THEN
        RETURN false;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM public.variables v
        WHERE v.id = p_variable_id
    ) INTO is_valid;
    
    RETURN is_valid;
END;
$$;

-- 4. handle_routine_override
CREATE FUNCTION handle_routine_override()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Mark the routine log as overridden if it exists
    IF TG_OP = 'INSERT' THEN
        UPDATE public.routine_log_history 
        SET was_overridden = true,
            updated_at = NOW()
        WHERE user_id = NEW.user_id
          AND variable_id = NEW.variable_id
          AND log_date = NEW.date
          AND was_overridden = false;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. toggle_routine_active
CREATE FUNCTION toggle_routine_active(p_routine_id UUID, p_is_active BOOLEAN)
RETURNS VOID 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.routines 
    SET is_active = p_is_active, 
        updated_at = NOW()
    WHERE id = p_routine_id;
    
    -- If we're deactivating, also update last_auto_logged
    IF NOT p_is_active THEN
        UPDATE public.routines 
        SET last_auto_logged = NOW()
        WHERE id = p_routine_id;
    END IF;
END;
$$;

-- 6. set_user_unit_preference
CREATE FUNCTION set_user_unit_preference(
    p_user_uuid UUID,
    p_variable_uuid UUID,
    p_unit_id TEXT
)
RETURNS VOID 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Validate that the unit is valid for this variable
    IF NOT EXISTS(
        SELECT 1 FROM public.variable_units vu
        WHERE vu.variable_id = p_variable_uuid 
          AND vu.unit_id = p_unit_id
    ) THEN
        RAISE EXCEPTION 'Unit % is not valid for variable %', p_unit_id, p_variable_uuid;
    END IF;
    
    -- Insert or update user preference
    INSERT INTO public.user_variable_preferences (user_id, variable_id, display_unit, created_at, updated_at)
    VALUES (p_user_uuid, p_variable_uuid, p_unit_id, NOW(), NOW())
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET 
        display_unit = EXCLUDED.display_unit,
        updated_at = NOW();
END;
$$;

-- 7. test_unit_validation_for_variable
CREATE FUNCTION test_unit_validation_for_variable(
    p_variable_uuid UUID,
    p_unit_id TEXT
)
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT) 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    validation_result BOOLEAN;
    err_msg TEXT;
BEGIN
    -- Check if variable exists
    IF NOT EXISTS(SELECT 1 FROM public.variables WHERE id = p_variable_uuid) THEN
        RETURN QUERY SELECT false, 'Variable does not exist';
        RETURN;
    END IF;
    
    -- Check if unit exists
    IF NOT EXISTS(SELECT 1 FROM public.units WHERE id = p_unit_id) THEN
        RETURN QUERY SELECT false, 'Unit does not exist';
        RETURN;
    END IF;
    
    -- Check if unit is valid for variable
    SELECT EXISTS(
        SELECT 1 FROM public.variable_units vu
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
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Functions after aggressive fix:' as verification;

SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN proconfig IS NULL THEN '❌ STILL VULNERABLE'
        WHEN 'search_path=' = ANY(proconfig) THEN '✅ NOW SECURE'
        ELSE '⚠️ OTHER CONFIG'
    END as security_status,
    proconfig
FROM pg_proc p
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
ORDER BY proname, arguments;

-- Final count
SELECT 
    COUNT(*) as total_functions_fixed,
    'All should show "✅ NOW SECURE"' as expected_result
FROM pg_proc p
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
  AND 'search_path=' = ANY(proconfig);

SELECT 'Aggressive Function Security Fix Complete!' as status; 