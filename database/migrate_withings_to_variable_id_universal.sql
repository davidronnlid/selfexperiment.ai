-- Universal Migration: Update withings_variable_data_points to use variable_id
-- This script handles both old schema (with variable column) and new schema scenarios

-- ============================================================================
-- STEP 1: Create Withings variables if they don't exist
-- ============================================================================

-- Insert Withings variables (avoiding duplicates)
INSERT INTO variables (slug, label, description, data_type, canonical_unit, unit_group, convertible_units, default_display_unit, source_type, category, is_active)
VALUES 
  ('weight', 'Weight', 'Weight measured by Withings device', 'continuous', 'kg', 'mass', '["kg", "lb", "g"]', 'kg', 'withings', 'Body Composition', true),
  ('fat_free_mass', 'Fat Free Mass', 'Fat Free Mass measured by Withings device', 'continuous', 'kg', 'mass', '["kg", "lb", "g"]', 'kg', 'withings', 'Body Composition', true),
  ('fat_ratio', 'Fat Ratio', 'Fat Ratio measured by Withings device', 'continuous', '%', 'percentage', '["%"]', '%', 'withings', 'Body Composition', true),
  ('fat_mass', 'Fat Mass', 'Fat Mass measured by Withings device', 'continuous', 'kg', 'mass', '["kg", "lb", "g"]', 'kg', 'withings', 'Body Composition', true),
  ('muscle_mass', 'Muscle Mass', 'Muscle Mass measured by Withings device', 'continuous', 'kg', 'mass', '["kg", "lb", "g"]', 'kg', 'withings', 'Body Composition', true),
  ('hydration', 'Hydration', 'Hydration measured by Withings device', 'continuous', 'kg', 'mass', '["kg", "lb", "g"]', 'kg', 'withings', 'Body Composition', true),
  ('bone_mass', 'Bone Mass', 'Bone Mass measured by Withings device', 'continuous', 'kg', 'mass', '["kg", "lb", "g"]', 'kg', 'withings', 'Body Composition', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 2: Check current table structure and handle accordingly
-- ============================================================================

DO $$
DECLARE
    variable_column_exists BOOLEAN;
    variable_id_column_exists BOOLEAN;
    record_count INTEGER;
BEGIN
    -- Check if 'variable' column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'withings_variable_data_points' 
        AND column_name = 'variable'
    ) INTO variable_column_exists;
    
    -- Check if 'variable_id' column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'withings_variable_data_points' 
        AND column_name = 'variable_id'
    ) INTO variable_id_column_exists;
    
    -- Get record count
    EXECUTE 'SELECT COUNT(*) FROM withings_variable_data_points' INTO record_count;
    
    RAISE NOTICE 'Table analysis:';
    RAISE NOTICE '- variable column exists: %', variable_column_exists;
    RAISE NOTICE '- variable_id column exists: %', variable_id_column_exists;
    RAISE NOTICE '- total records: %', record_count;
    
    -- Case 1: Old schema with 'variable' column but no 'variable_id'
    IF variable_column_exists AND NOT variable_id_column_exists THEN
        RAISE NOTICE 'CASE 1: Old schema detected - adding variable_id and migrating data';
        
        -- Add variable_id column
        ALTER TABLE withings_variable_data_points 
        ADD COLUMN variable_id UUID REFERENCES variables(id);
        
        -- Migrate data using explicit mappings
        UPDATE withings_variable_data_points 
        SET variable_id = (SELECT id FROM variables WHERE slug = 'weight' AND source_type = 'withings')
        WHERE variable = 'weight_kg';
        
        UPDATE withings_variable_data_points 
        SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_free_mass' AND source_type = 'withings')
        WHERE variable = 'fat_free_mass_kg';
        
        UPDATE withings_variable_data_points 
        SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_ratio' AND source_type = 'withings')
        WHERE variable = 'fat_ratio';
        
        UPDATE withings_variable_data_points 
        SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_mass' AND source_type = 'withings')
        WHERE variable = 'fat_mass_weight_kg';
        
        UPDATE withings_variable_data_points 
        SET variable_id = (SELECT id FROM variables WHERE slug = 'muscle_mass' AND source_type = 'withings')
        WHERE variable = 'muscle_mass_kg';
        
        UPDATE withings_variable_data_points 
        SET variable_id = (SELECT id FROM variables WHERE slug = 'hydration' AND source_type = 'withings')
        WHERE variable = 'hydration_kg';
        
        UPDATE withings_variable_data_points 
        SET variable_id = (SELECT id FROM variables WHERE slug = 'bone_mass' AND source_type = 'withings')
        WHERE variable = 'bone_mass_kg';
        
        -- Check for unmapped records
        EXECUTE 'SELECT COUNT(*) FROM withings_variable_data_points WHERE variable_id IS NULL' INTO record_count;
        IF record_count > 0 THEN
            RAISE NOTICE 'WARNING: % records could not be mapped to variables', record_count;
        END IF;
        
        -- Make variable_id NOT NULL
        ALTER TABLE withings_variable_data_points ALTER COLUMN variable_id SET NOT NULL;
        
        RAISE NOTICE 'Migration completed for old schema';
        
    -- Case 2: New schema with 'variable_id' but no 'variable' column  
    ELSIF NOT variable_column_exists AND variable_id_column_exists THEN
        RAISE NOTICE 'CASE 2: New schema detected - table already uses variable_id';
        RAISE NOTICE 'No migration needed - checking if records reference proper variables';
        
        -- Check if records have valid variable_id references
        EXECUTE 'SELECT COUNT(*) FROM withings_variable_data_points WHERE variable_id IS NULL' INTO record_count;
        IF record_count > 0 THEN
            RAISE NOTICE 'WARNING: % records have NULL variable_id', record_count;
        END IF;
        
    -- Case 3: Both columns exist (migration in progress)
    ELSIF variable_column_exists AND variable_id_column_exists THEN
        RAISE NOTICE 'CASE 3: Both columns exist - completing migration';
        
        -- Update any records that don't have variable_id set
        EXECUTE 'SELECT COUNT(*) FROM withings_variable_data_points WHERE variable_id IS NULL' INTO record_count;
        IF record_count > 0 THEN
            RAISE NOTICE 'Found % records without variable_id, mapping them now', record_count;
            
            UPDATE withings_variable_data_points 
            SET variable_id = (SELECT id FROM variables WHERE slug = 'weight' AND source_type = 'withings')
            WHERE variable = 'weight_kg' AND variable_id IS NULL;
            
            UPDATE withings_variable_data_points 
            SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_free_mass' AND source_type = 'withings')
            WHERE variable = 'fat_free_mass_kg' AND variable_id IS NULL;
            
            UPDATE withings_variable_data_points 
            SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_ratio' AND source_type = 'withings')
            WHERE variable = 'fat_ratio' AND variable_id IS NULL;
            
            UPDATE withings_variable_data_points 
            SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_mass' AND source_type = 'withings')
            WHERE variable = 'fat_mass_weight_kg' AND variable_id IS NULL;
            
            UPDATE withings_variable_data_points 
            SET variable_id = (SELECT id FROM variables WHERE slug = 'muscle_mass' AND source_type = 'withings')
            WHERE variable = 'muscle_mass_kg' AND variable_id IS NULL;
            
            UPDATE withings_variable_data_points 
            SET variable_id = (SELECT id FROM variables WHERE slug = 'hydration' AND source_type = 'withings')
            WHERE variable = 'hydration_kg' AND variable_id IS NULL;
            
            UPDATE withings_variable_data_points 
            SET variable_id = (SELECT id FROM variables WHERE slug = 'bone_mass' AND source_type = 'withings')
            WHERE variable = 'bone_mass_kg' AND variable_id IS NULL;
        END IF;
        
        -- Make variable_id NOT NULL
        ALTER TABLE withings_variable_data_points ALTER COLUMN variable_id SET NOT NULL;
        
        RAISE NOTICE 'Migration completed for hybrid schema';
        
    -- Case 4: Neither column exists (empty/broken table)
    ELSE
        RAISE NOTICE 'CASE 4: Neither variable nor variable_id column found';
        
        -- Add variable_id column
        ALTER TABLE withings_variable_data_points 
        ADD COLUMN variable_id UUID REFERENCES variables(id) NOT NULL;
        
        RAISE NOTICE 'Added variable_id column to empty table';
    END IF;
    
END $$;

-- ============================================================================
-- STEP 3: Update constraints and indexes
-- ============================================================================

-- Drop old unique constraint if it exists
ALTER TABLE withings_variable_data_points 
DROP CONSTRAINT IF EXISTS withings_variable_data_points_user_id_date_variable_key;

-- Add new unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'withings_variable_data_points_user_id_date_variable_id_key'
    ) THEN
        ALTER TABLE withings_variable_data_points 
        ADD CONSTRAINT withings_variable_data_points_user_id_date_variable_id_key 
        UNIQUE (user_id, date, variable_id);
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Update indexes
-- ============================================================================

-- Drop old index on variable column if it exists
DROP INDEX IF EXISTS idx_withings_variable_data_points_variable;

-- Create new index on variable_id
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_variable_id 
ON withings_variable_data_points(variable_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check final table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'withings_variable_data_points'
ORDER BY ordinal_position;

-- Check that all records have variable_id
SELECT 
  COUNT(*) as total_records,
  COUNT(variable_id) as records_with_variable_id,
  COUNT(*) - COUNT(variable_id) as orphaned_records
FROM withings_variable_data_points;

-- Check variable distribution
SELECT 
  v.slug,
  v.label,
  COUNT(wd.id) as record_count
FROM variables v
LEFT JOIN withings_variable_data_points wd ON v.id = wd.variable_id
WHERE v.source_type = 'withings'
GROUP BY v.id, v.slug, v.label
ORDER BY record_count DESC;

-- Final success message
DO $$
DECLARE
    total_records INTEGER;
    total_variables INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM withings_variable_data_points;
    SELECT COUNT(*) INTO total_variables FROM variables WHERE source_type = 'withings';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '📊 Total Withings records: %', total_records;
    RAISE NOTICE '📋 Total Withings variables: %', total_variables;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Deploy updated edge function: supabase functions deploy withings-sync-all';
    RAISE NOTICE '2. Test the integration using /withings-test';
    RAISE NOTICE '3. Verify data appears correctly in your dashboard';
END $$; 