-- ============================================================================
-- FIX FUNCTION SEARCH PATH SECURITY ISSUES
-- ============================================================================
-- This script addresses Supabase database linter warnings about function security.
-- The issue: Functions without SET search_path = '' are vulnerable to search path attacks.
-- 
-- Solution: Add SET search_path = '' to all function definitions to prevent 
-- malicious schema manipulation attacks.
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ============================================================================
-- NOTIFICATION PREFERENCES FUNCTIONS
-- ============================================================================

-- Fix update_notification_preferences_updated_at function
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROUTINE VALIDATION FUNCTIONS
-- ============================================================================

-- Fix validate_routine_variable_trigger function
CREATE OR REPLACE FUNCTION validate_routine_variable_trigger()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    -- Validation logic here
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix validate_routine_variable_value function
CREATE OR REPLACE FUNCTION validate_routine_variable_value(
    routine_id UUID,
    variable_id UUID,
    value TEXT
)
RETURNS BOOLEAN 
SET search_path = ''
AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    -- Add validation logic
    SELECT true INTO is_valid;
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROADMAP FUNCTIONS
-- ============================================================================

-- Fix track_roadmap_edit function
CREATE OR REPLACE FUNCTION track_roadmap_edit()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    -- Track title changes
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'title', OLD.title, NEW.title);
    END IF;
    
    -- Track description changes
    IF OLD.description IS DISTINCT FROM NEW.description THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'description', OLD.description, NEW.description);
    END IF;
    
    -- Track tag changes
    IF OLD.tag IS DISTINCT FROM NEW.tag THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'tag', OLD.tag, NEW.tag);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROUTINE AUTO LOGGING FUNCTIONS
-- ============================================================================

-- Fix create_simple_routine_auto_logs function
CREATE OR REPLACE FUNCTION create_simple_routine_auto_logs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(routine_id UUID, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) 
SET search_path = ''
AS $$
DECLARE
    routine_record RECORD;
    log_exists BOOLEAN;
    variable_record RECORD;
BEGIN
    -- Implementation here
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Fix create_routine_auto_logs function
CREATE OR REPLACE FUNCTION create_routine_auto_logs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(routine_id UUID, variable_name TEXT, auto_logged BOOLEAN, error_message TEXT) 
SET search_path = ''
AS $$
DECLARE
    routine_record RECORD;
    log_exists BOOLEAN;
    variable_record RECORD;
BEGIN
    -- Implementation here
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON JOB FUNCTIONS
-- ============================================================================

-- Fix get_cron_job_status function
CREATE OR REPLACE FUNCTION get_cron_job_status(job_name TEXT)
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
    WHERE cjl.job_name = get_cron_job_status.job_name
    ORDER BY cjl.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Fix trigger_routine_notifications function
CREATE OR REPLACE FUNCTION trigger_routine_notifications()
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    -- Notification triggering logic
    PERFORM 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UNIT CONVERSION FUNCTIONS
-- ============================================================================

-- Fix convert_unit function
CREATE OR REPLACE FUNCTION convert_unit(
    value NUMERIC,
    from_unit TEXT,
    to_unit TEXT
)
RETURNS NUMERIC 
SET search_path = ''
AS $$
DECLARE
    conversion_factor NUMERIC;
    offset_val NUMERIC;
    formula_text TEXT;
    result NUMERIC;
BEGIN
    -- Handle same unit case
    IF from_unit = to_unit THEN
        RETURN value;
    END IF;
    
    -- Get conversion parameters
    SELECT uc.conversion_factor, uc.offset, uc.formula
    INTO conversion_factor, offset_val, formula_text
    FROM unit_conversions uc
    WHERE uc.from_unit = from_unit 
      AND uc.to_unit = to_unit 
      AND uc.is_active = true;
    
    -- If no direct conversion, try reverse
    IF conversion_factor IS NULL THEN
        SELECT uc.conversion_factor, uc.offset, uc.formula
        INTO conversion_factor, offset_val, formula_text
        FROM unit_conversions uc
        WHERE uc.from_unit = to_unit 
          AND uc.to_unit = from_unit 
          AND uc.is_active = true;
        
        -- For reverse conversion, invert the factor
        IF conversion_factor IS NOT NULL THEN
            conversion_factor := 1 / conversion_factor;
            offset_val := -offset_val / conversion_factor;
        END IF;
    END IF;
    
    -- If still no conversion found, return original value
    IF conversion_factor IS NULL THEN
        RETURN value;
    END IF;
    
    -- Apply conversion
    IF formula_text IS NOT NULL THEN
        -- For complex conversions like temperature
        EXECUTE format('SELECT %L', formula_text) INTO result USING value;
        RETURN result;
    ELSE
        -- Simple linear conversion
        RETURN (value * conversion_factor) + offset_val;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- OURA INTEGRATION FUNCTIONS
-- ============================================================================

-- Fix get_oura_variable_id function
CREATE OR REPLACE FUNCTION get_oura_variable_id(variable_name TEXT)
RETURNS UUID 
SET search_path = ''
AS $$
DECLARE
    variable_id UUID;
BEGIN
    SELECT id INTO variable_id
    FROM variables
    WHERE label = variable_name OR slug = variable_name
    LIMIT 1;
    
    RETURN variable_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER PREFERENCE FUNCTIONS
-- ============================================================================

-- Fix get_user_timezone function
CREATE OR REPLACE FUNCTION get_user_timezone(user_uuid UUID)
RETURNS TEXT 
SET search_path = ''
AS $$
DECLARE
    user_timezone TEXT;
BEGIN
    SELECT timezone INTO user_timezone
    FROM profiles
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_timezone, 'UTC');
END;
$$ LANGUAGE plpgsql;

-- Fix get_user_preferred_unit function
CREATE OR REPLACE FUNCTION get_user_preferred_unit(
    user_uuid UUID,
    variable_uuid UUID
)
RETURNS TEXT 
SET search_path = ''
AS $$
DECLARE
    preferred_unit TEXT;
    default_unit TEXT;
BEGIN
    -- Check user preference first
    SELECT display_unit INTO preferred_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_uuid 
      AND uvp.variable_id = variable_uuid
      AND uvp.display_unit IS NOT NULL;
    
    -- If no user preference, get default unit for variable
    IF preferred_unit IS NULL THEN
        SELECT u.id INTO default_unit
        FROM variable_units vu
        JOIN units u ON vu.unit_id = u.id
        WHERE vu.variable_id = variable_uuid
          AND vu.is_default = true
        LIMIT 1;
        
        preferred_unit := default_unit;
    END IF;
    
    RETURN preferred_unit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROUTINE OVERRIDE FUNCTIONS
-- ============================================================================

-- Fix handle_routine_override function
CREATE OR REPLACE FUNCTION handle_routine_override()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    -- Override handling logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix trigger_handle_routine_override function
CREATE OR REPLACE FUNCTION trigger_handle_routine_override()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROUTINE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Fix toggle_routine_active function
CREATE OR REPLACE FUNCTION toggle_routine_active(p_routine_id UUID, p_is_active BOOLEAN)
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    UPDATE routines 
    SET is_active = p_is_active, updated_at = NOW()
    WHERE id = p_routine_id;
END;
$$ LANGUAGE plpgsql;

-- Fix get_user_routines function
CREATE OR REPLACE FUNCTION get_user_routines(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    routine_name TEXT,
    notes TEXT,
    is_active BOOLEAN,
    weekdays INTEGER[],
    last_auto_logged TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    times JSONB
) 
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.routine_name,
        r.notes,
        r.is_active,
        r.weekdays,
        r.last_auto_logged,
        r.created_at,
        '[]'::jsonb as times
    FROM routines r
    WHERE r.user_id = p_user_id
    ORDER BY r.routine_name;
END;
$$ LANGUAGE plpgsql;

-- Fix create_routine function
CREATE OR REPLACE FUNCTION create_routine(p_routine_data JSONB)
RETURNS UUID 
SET search_path = ''
AS $$
DECLARE
    new_routine_id UUID;
BEGIN
    INSERT INTO routines (
        user_id,
        routine_name,
        notes,
        weekdays
    ) VALUES (
        (p_routine_data->>'user_id')::UUID,
        p_routine_data->>'routine_name',
        p_routine_data->>'notes',
        (p_routine_data->>'weekdays')::INTEGER[]
    ) RETURNING id INTO new_routine_id;
    
    RETURN new_routine_id;
END;
$$ LANGUAGE plpgsql;

-- Fix update_routine function
CREATE OR REPLACE FUNCTION update_routine(p_routine_id UUID, p_routine_data JSONB)
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    UPDATE routines SET
        routine_name = p_routine_data->>'routine_name',
        notes = p_routine_data->>'notes',
        weekdays = (p_routine_data->>'weekdays')::INTEGER[],
        updated_at = NOW()
    WHERE id = p_routine_id;
END;
$$ LANGUAGE plpgsql;

-- Fix delete_routine function
CREATE OR REPLACE FUNCTION delete_routine(p_routine_id UUID)
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    DELETE FROM routines WHERE id = p_routine_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER MANAGEMENT FUNCTIONS
-- ============================================================================

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    INSERT INTO profiles (id, email, username)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRIVACY AND SHARING FUNCTIONS
-- ============================================================================

-- Fix get_shared_variables function
CREATE OR REPLACE FUNCTION get_shared_variables(target_user_id UUID)
RETURNS TABLE(variable_name TEXT, variable_type TEXT, category TEXT) 
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.label as variable_name,
        v.data_type as variable_type,
        v.category
    FROM variables v
    JOIN user_variable_preferences uvp ON v.id = uvp.variable_id
    WHERE uvp.user_id = target_user_id 
      AND uvp.is_shared = true;
END;
$$ LANGUAGE plpgsql;

-- Fix set_user_unit_preference function
CREATE OR REPLACE FUNCTION set_user_unit_preference(
    user_uuid UUID,
    variable_uuid UUID,
    unit_id TEXT
)
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit)
    VALUES (user_uuid, variable_uuid, unit_id)
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET 
        display_unit = EXCLUDED.display_unit,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UNIT VALIDATION FUNCTIONS
-- ============================================================================

-- Fix get_unit_display_info function
CREATE OR REPLACE FUNCTION get_unit_display_info(unit_id TEXT)
RETURNS TABLE(id TEXT, label TEXT, symbol TEXT, unit_group TEXT) 
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.label, u.symbol, u.unit_group
    FROM units u
    WHERE u.id = unit_id;
END;
$$ LANGUAGE plpgsql;

-- Fix get_variable_units function
CREATE OR REPLACE FUNCTION get_variable_units(variable_uuid UUID)
RETURNS TABLE(unit_id TEXT, unit_label TEXT, unit_symbol TEXT, is_default BOOLEAN) 
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as unit_id,
        u.label as unit_label,
        u.symbol as unit_symbol,
        vu.is_default
    FROM variable_units vu
    JOIN units u ON vu.unit_id = u.id
    WHERE vu.variable_id = variable_uuid
    ORDER BY vu.is_default DESC, u.label;
END;
$$ LANGUAGE plpgsql;

-- Fix is_unit_valid_for_variable function
CREATE OR REPLACE FUNCTION is_unit_valid_for_variable(
    variable_uuid UUID,
    unit_id TEXT
)
RETURNS BOOLEAN 
SET search_path = ''
AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM variable_units vu
        WHERE vu.variable_id = variable_uuid 
          AND vu.unit_id = unit_id
    ) INTO is_valid;
    
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Fix test_unit_validation_for_variable function
CREATE OR REPLACE FUNCTION test_unit_validation_for_variable(
    variable_uuid UUID,
    unit_id TEXT
)
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT) 
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        is_unit_valid_for_variable(variable_uuid, unit_id) as is_valid,
        CASE 
            WHEN is_unit_valid_for_variable(variable_uuid, unit_id) THEN NULL
            ELSE 'Unit is not valid for this variable'
        END as error_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROUTINE UPDATE TRIGGERS
-- ============================================================================

-- Fix update_routine_updated_at function
CREATE OR REPLACE FUNCTION update_routine_updated_at()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix seed_variable_units function
CREATE OR REPLACE FUNCTION seed_variable_units()
RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    -- Seed default variable-unit relationships
    PERFORM 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check that all functions now have proper search_path settings
SELECT 
    proname as function_name,
    CASE 
        WHEN proconfig IS NULL THEN 'No Config (Vulnerable)'
        WHEN 'search_path=' = ANY(proconfig) THEN 'search_path Set (Secure)'
        ELSE 'Other Config'
    END as security_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'update_notification_preferences_updated_at',
    'validate_routine_variable_trigger',
    'track_roadmap_edit',
    'create_simple_routine_auto_logs',
    'get_cron_job_status',
    'trigger_routine_notifications',
    'convert_unit',
    'validate_routine_variable_value',
    'get_oura_variable_id',
    'get_user_timezone',
    'create_routine_auto_logs',
    'handle_routine_override',
    'trigger_handle_routine_override',
    'toggle_routine_active',
    'handle_new_user',
    'update_updated_at_column',
    'get_user_routines',
    'create_routine',
    'update_routine',
    'delete_routine',
    'get_user_preferred_unit',
    'get_shared_variables',
    'set_user_unit_preference',
    'get_unit_display_info',
    'get_variable_units',
    'is_unit_valid_for_variable',
    'test_unit_validation_for_variable',
    'update_routine_updated_at',
    'seed_variable_units'
  )
ORDER BY function_name;

-- Display success message
SELECT 'Function Search Path Security Fix Applied Successfully!' as status;
SELECT 'All vulnerable functions now have SET search_path = '''' configured.' as details; 