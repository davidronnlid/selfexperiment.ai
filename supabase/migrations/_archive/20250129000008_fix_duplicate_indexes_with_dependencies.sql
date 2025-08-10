-- ============================================================================
-- Fix duplicate indexes - handle foreign key dependencies properly
-- This completes the cleanup that failed in the previous migration
-- ============================================================================

-- data_points: handle foreign key dependency then drop duplicate constraint
DO $$
BEGIN
  -- First, check if there's a foreign key referencing logs_id_key and fix it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'log_likes_data_point_id_fkey' 
      AND table_name = 'data_point_likes'
  ) THEN
    -- Drop and recreate foreign key to reference primary key instead
    EXECUTE 'ALTER TABLE public.data_point_likes DROP CONSTRAINT log_likes_data_point_id_fkey';
    EXECUTE 'ALTER TABLE public.data_point_likes ADD CONSTRAINT log_likes_data_point_id_fkey 
             FOREIGN KEY (data_point_id) REFERENCES public.data_points(id)';
  END IF;
  
  -- Now drop the duplicate constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'logs_id_key' 
      AND conrelid = 'public.data_points'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.data_points DROP CONSTRAINT logs_id_key';
  END IF;
END $$;

-- notification_preferences: drop the extra unique if duplicated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notification_preferences_user_id_unique' 
      AND conrelid = 'public.notification_preferences'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.notification_preferences DROP CONSTRAINT notification_preferences_user_id_unique';
  ELSIF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname = 'notification_preferences_user_id_unique'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.notification_preferences_user_id_unique';
  END IF;
END $$;

-- routine_variables: if two indexes have identical definitions, drop one
DO $$
DECLARE
  def1 text;
  def2 text;
BEGIN
  SELECT indexdef INTO def1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'routine_variables' AND indexname = 'idx_routine_variables_user_weekdays';
  SELECT indexdef INTO def2 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'routine_variables' AND indexname = 'routine_variables_routine_id_idx';
  IF def1 IS NOT NULL AND def2 IS NOT NULL AND def1 = def2 THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_routine_variables_user_weekdays';
  END IF;
END $$;

-- withings_variable_data_points: drop duplicate user_id index by older name
DO $$
DECLARE
  w1 text;
  w2 text;
BEGIN
  SELECT indexdef INTO w1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'withings_variable_data_points' AND indexname = 'idx_withings_variable_data_points_user_id';
  SELECT indexdef INTO w2 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'withings_variable_data_points' AND indexname = 'idx_withings_variable_logs_user_id';
  IF w1 IS NOT NULL AND w2 IS NOT NULL AND w1 = w2 THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_withings_variable_logs_user_id';
  END IF;
END $$;

-- withings_variable_data_points: drop duplicate unique constraint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'withings_variable_data_points_id_key' 
      AND conrelid = 'public.withings_variable_data_points'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.withings_variable_data_points DROP CONSTRAINT withings_variable_data_points_id_key';
  END IF;
END $$;

-- Success message
SELECT 'Duplicate index cleanup completed successfully!' as status;
