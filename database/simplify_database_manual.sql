-- Manual Database Simplification Script
-- Run this in your Supabase SQL Editor

-- Step 1: Remove unused columns from variable_logs
ALTER TABLE variable_logs 
DROP COLUMN IF EXISTS canonical_value,
DROP COLUMN IF EXISTS confidence_score,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS location;

-- Step 2: Remove unused columns from variables
ALTER TABLE variables 
DROP COLUMN IF EXISTS collection_method,
DROP COLUMN IF EXISTS frequency,
DROP COLUMN IF EXISTS subcategory,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS is_public,
DROP COLUMN IF EXISTS privacy_level;

-- Step 3: Remove unused tables (only if they exist)
DROP TABLE IF EXISTS user_variable_preferences CASCADE;
DROP TABLE IF EXISTS unit_conversions CASCADE;
DROP TABLE IF EXISTS variable_relationships CASCADE;
DROP TABLE IF EXISTS routine_log_history CASCADE;
DROP TABLE IF EXISTS log_privacy_settings CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS user_profile_settings CASCADE;

-- Step 4: Remove unused indexes (only if they exist)
DROP INDEX IF EXISTS idx_user_variable_preferences_user_id;
DROP INDEX IF EXISTS idx_user_variable_preferences_variable_id;
DROP INDEX IF EXISTS idx_user_variable_preferences_is_tracked;
DROP INDEX IF EXISTS idx_user_variable_preferences_is_shared;
DROP INDEX IF EXISTS idx_unit_conversions_from_unit;
DROP INDEX IF EXISTS idx_unit_conversions_to_unit;
DROP INDEX IF EXISTS idx_unit_conversions_unit_group;
DROP INDEX IF EXISTS idx_variable_relationships_variable_1;
DROP INDEX IF EXISTS idx_variable_relationships_variable_2;
DROP INDEX IF EXISTS idx_variable_relationships_type;
DROP INDEX IF EXISTS idx_variables_unit_group;
DROP INDEX IF EXISTS idx_variable_logs_is_private;

-- Step 5: Update variable_logs constraint
ALTER TABLE variable_logs 
DROP CONSTRAINT IF EXISTS variable_logs_canonical_value_check;

-- Add a new constraint that only checks for display_value
ALTER TABLE variable_logs 
ADD CONSTRAINT variable_logs_display_value_check 
CHECK (display_value IS NOT NULL);

-- Step 6: Clean up orphaned data (only for tables that exist)
DELETE FROM variable_logs 
WHERE variable_id NOT IN (SELECT id FROM variables);

-- Only clean up routine tables if they exist
DO $$
BEGIN
    -- Check if routine_time_variables exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'routine_time_variables') THEN
        DELETE FROM routine_time_variables 
        WHERE variable_id NOT IN (SELECT id FROM variables);
        
        DELETE FROM routine_time_variables 
        WHERE routine_time_id NOT IN (SELECT id FROM routine_times);
    END IF;
    
    -- Check if routine_times exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'routine_times') THEN
        DELETE FROM routine_times 
        WHERE routine_id NOT IN (SELECT id FROM daily_routines);
    END IF;
END $$;

-- Step 7: Verify the simplified schema
SELECT 'Current tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Step 8: Show variable_logs structure
SELECT 'variable_logs structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'variable_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position; 