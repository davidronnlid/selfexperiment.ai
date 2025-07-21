-- ============================================================================
-- MANUAL FIX FOR PERSISTENT FUNCTION SECURITY ISSUES
-- ============================================================================
-- This script manually fixes each function individually.
-- Run this AFTER the diagnostic script to see what exactly needs fixing.

-- ============================================================================
-- BEFORE RUNNING: Get the exact function signatures from diagnostic
-- ============================================================================
-- 1. Run: \i database/diagnose_persistent_functions.sql
-- 2. Copy the exact DROP commands from Step 5 
-- 3. Modify this script if needed based on diagnostic results
-- 4. Then run this script

-- ============================================================================
-- MANUAL FIX: Function 1 - create_simple_routine_auto_logs
-- ============================================================================

-- Drop all possible variants (modify based on diagnostic results)
DROP FUNCTION IF EXISTS public.create_simple_routine_auto_logs() CASCADE;
DROP FUNCTION IF EXISTS public.create_simple_routine_auto_logs(date) CASCADE;
DROP FUNCTION IF EXISTS public.create_simple_routine_auto_logs(target_date date) CASCADE;
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs() CASCADE;
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs(date) CASCADE;
DROP FUNCTION IF EXISTS create_simple_routine_auto_logs(target_date date) CASCADE;

-- Recreate with security
CREATE FUNCTION public.create_simple_routine_auto_logs(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(routine_id uuid, variable_name text, auto_logged boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    routine_record RECORD;
    log_exists BOOLEAN;
BEGIN
    FOR routine_record IN
        SELECT r.id, r.routine_name, r.user_id
        FROM public.routines r
        WHERE r.is_active = true
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.data_points dp
            WHERE dp.user_id = routine_record.user_id
              AND dp.date = target_date
        ) INTO log_exists;

        routine_id := routine_record.id;
        variable_name := 'routine_check';
        auto_logged := NOT log_exists;
        error_message := NULL;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;

-- ============================================================================
-- MANUAL FIX: Function 2 - validate_routine_variable_value
-- ============================================================================

-- Drop all possible variants
DROP FUNCTION IF EXISTS public.validate_routine_variable_value(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_routine_variable_value(routine_id uuid, variable_id uuid, value text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_routine_variable_value(p_routine_id uuid, p_variable_id uuid, p_value text) CASCADE;
DROP FUNCTION IF EXISTS validate_routine_variable_value(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS validate_routine_variable_value(routine_id uuid, variable_id uuid, value text) CASCADE;
DROP FUNCTION IF EXISTS validate_routine_variable_value(p_routine_id uuid, p_variable_id uuid, p_value text) CASCADE;

-- Recreate with security
CREATE FUNCTION public.validate_routine_variable_value(
    p_routine_id uuid,
    p_variable_id uuid,
    p_value text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    IF p_value IS NULL OR LENGTH(TRIM(p_value)) = 0 THEN
        RETURN false;
    END IF;
    
    SELECT EXISTS(SELECT 1 FROM public.routines WHERE id = p_routine_id) INTO is_valid;
    IF NOT is_valid THEN RETURN false; END IF;
    
    SELECT EXISTS(SELECT 1 FROM public.variables WHERE id = p_variable_id) INTO is_valid;
    RETURN is_valid;
END;
$$;

-- ============================================================================
-- MANUAL FIX: Function 3 - handle_routine_override
-- ============================================================================

-- Drop all possible variants
DROP FUNCTION IF EXISTS public.handle_routine_override() CASCADE;
DROP FUNCTION IF EXISTS handle_routine_override() CASCADE;

-- Recreate with security
CREATE FUNCTION public.handle_routine_override()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.routine_log_history 
        SET was_overridden = true, updated_at = NOW()
        WHERE user_id = NEW.user_id
          AND variable_id = NEW.variable_id
          AND log_date = NEW.date
          AND was_overridden = false;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- MANUAL FIX: Function 4 - toggle_routine_active
-- ============================================================================

-- Drop all possible variants
DROP FUNCTION IF EXISTS public.toggle_routine_active(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.toggle_routine_active(routine_id uuid, is_active boolean) CASCADE;
DROP FUNCTION IF EXISTS public.toggle_routine_active(p_routine_id uuid, p_is_active boolean) CASCADE;
DROP FUNCTION IF EXISTS toggle_routine_active(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS toggle_routine_active(routine_id uuid, is_active boolean) CASCADE;
DROP FUNCTION IF EXISTS toggle_routine_active(p_routine_id uuid, p_is_active boolean) CASCADE;

-- Recreate with security
CREATE FUNCTION public.toggle_routine_active(p_routine_id uuid, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.routines 
    SET is_active = p_is_active, updated_at = NOW()
    WHERE id = p_routine_id;
    
    IF NOT p_is_active THEN
        UPDATE public.routines 
        SET last_auto_logged = NOW()
        WHERE id = p_routine_id;
    END IF;
END;
$$;

-- ============================================================================
-- MANUAL FIX: Function 5 - set_user_unit_preference
-- ============================================================================

-- Drop all possible variants
DROP FUNCTION IF EXISTS public.set_user_unit_preference(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_unit_preference(user_uuid uuid, variable_uuid uuid, unit_id text) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_unit_preference(p_user_uuid uuid, p_variable_uuid uuid, p_unit_id text) CASCADE;
DROP FUNCTION IF EXISTS set_user_unit_preference(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS set_user_unit_preference(user_uuid uuid, variable_uuid uuid, unit_id text) CASCADE;
DROP FUNCTION IF EXISTS set_user_unit_preference(p_user_uuid uuid, p_variable_uuid uuid, p_unit_id text) CASCADE;

-- Recreate with security
CREATE FUNCTION public.set_user_unit_preference(
    p_user_uuid uuid,
    p_variable_uuid uuid,
    p_unit_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM public.variable_units vu
        WHERE vu.variable_id = p_variable_uuid 
          AND vu.unit_id = p_unit_id
    ) THEN
        RAISE EXCEPTION 'Unit % is not valid for variable %', p_unit_id, p_variable_uuid;
    END IF;
    
    INSERT INTO public.user_variable_preferences (user_id, variable_id, display_unit, created_at, updated_at)
    VALUES (p_user_uuid, p_variable_uuid, p_unit_id, NOW(), NOW())
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET 
        display_unit = EXCLUDED.display_unit,
        updated_at = NOW();
END;
$$;

-- ============================================================================
-- MANUAL FIX: Function 6 - test_unit_validation_for_variable
-- ============================================================================

-- Drop all possible variants
DROP FUNCTION IF EXISTS public.test_unit_validation_for_variable(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.test_unit_validation_for_variable(variable_uuid uuid, unit_id text) CASCADE;
DROP FUNCTION IF EXISTS public.test_unit_validation_for_variable(p_variable_uuid uuid, p_unit_id text) CASCADE;
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(variable_uuid uuid, unit_id text) CASCADE;
DROP FUNCTION IF EXISTS test_unit_validation_for_variable(p_variable_uuid uuid, p_unit_id text) CASCADE;

-- Recreate with security
CREATE FUNCTION public.test_unit_validation_for_variable(
    p_variable_uuid uuid,
    p_unit_id text
)
RETURNS TABLE(is_valid boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    validation_result BOOLEAN;
    err_msg TEXT;
BEGIN
    IF NOT EXISTS(SELECT 1 FROM public.variables WHERE id = p_variable_uuid) THEN
        RETURN QUERY SELECT false, 'Variable does not exist';
        RETURN;
    END IF;
    
    IF NOT EXISTS(SELECT 1 FROM public.units WHERE id = p_unit_id) THEN
        RETURN QUERY SELECT false, 'Unit does not exist';
        RETURN;
    END IF;
    
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

SELECT 'Manual fix complete. Checking results...' as status;

SELECT 
    proname as function_name,
    CASE 
        WHEN proconfig IS NULL THEN '❌ STILL VULNERABLE'
        WHEN 'search_path=' = ANY(proconfig) THEN '✅ NOW SECURE'
        ELSE '⚠️ OTHER CONFIG: ' || array_to_string(proconfig, ', ')
    END as security_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'create_simple_routine_auto_logs',
    'validate_routine_variable_value',
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
ORDER BY proname;

SELECT 'If any functions still show as VULNERABLE, run the diagnostic script again' as next_step; 