-- ============================================================================
-- Fix Supabase Linter Security Warnings
-- - Ensure functions have immutable search_path (SET search_path = '')
-- - Move pg_net extension out of public schema
-- - Harden common trigger/helper functions
-- ============================================================================

-- Ensure the standard extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension from public to extensions if present and movable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      EXECUTE 'ALTER EXTENSION pg_net SET SCHEMA extensions';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not move extension pg_net to schema extensions: %', SQLERRM;
    END;
  END IF;
END$$;

-- For each known function signature, set an empty search_path if it exists
DO $$
DECLARE
  func_signature TEXT;
BEGIN
  FOR func_signature IN
    SELECT unnest(ARRAY[
      -- Trigger/helper functions
      'public.update_updated_at_column()',
      'public.handle_new_user()',
      'public.handle_routine_override()',
      'public.set_data_points_confirmed_default()',
      'public.sync_apple_health_to_data_points()',

      -- App logic functions (multiple known variants included)
      'public.get_user_shared_variables(uuid)',
      'public.create_simple_routine_auto_logs(uuid, date)',
      'public.create_simple_routine_auto_logs(date)',
      'public.validate_routine_variable_value(uuid, uuid, text)',
      'public.toggle_routine_active(uuid, boolean)',
      'public.test_unit_validation_for_variable(uuid, text)',
      'public.test_unit_validation_for_variable(text, text)'
    ])
  LOOP
    IF to_regprocedure(func_signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = '''';', func_signature);
    END IF;
  END LOOP;
END$$;

-- Verification (safe to run multiple times)
-- List the configured search_path status for targeted functions
DO $$
BEGIN
  RAISE NOTICE 'Search path configuration for key functions:';
END$$;

-- Note: The following SELECT will show up when running migrations manually
-- SELECT proname as function_name,
--        pg_get_function_identity_arguments(p.oid) as args,
--        CASE WHEN proconfig IS NULL THEN 'No Config (Vulnerable)'
--             WHEN 'search_path=' = ANY(proconfig) THEN 'search_path Set (Secure)'
--             ELSE 'Other Config' END as security_status
-- FROM pg_proc p
-- WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
--   AND proname IN (
--     'set_data_points_confirmed_default',
--     'get_user_shared_variables',
--     'create_simple_routine_auto_logs',
--     'sync_apple_health_to_data_points',
--     'validate_routine_variable_value',
--     'handle_routine_override',
--     'handle_new_user',
--     'update_updated_at_column',
--     'toggle_routine_active',
--     'test_unit_validation_for_variable'
--   )
-- ORDER BY function_name;


