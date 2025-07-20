-- Migration: Update withings_variable_data_points to use variable_id (FIXED VERSION)
-- This script migrates from using variable text to variable_id UUID reference

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
-- STEP 2: Add variable_id column to withings_variable_data_points
-- ============================================================================

-- Add variable_id column (allow NULL initially for migration)
ALTER TABLE withings_variable_data_points 
ADD COLUMN IF NOT EXISTS variable_id UUID REFERENCES variables(id);

-- ============================================================================
-- STEP 3: Update existing data to use variable_id (DIRECT APPROACH)
-- ============================================================================

-- Update weight records
UPDATE withings_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'weight' AND source_type = 'withings')
WHERE variable = 'weight_kg' AND variable_id IS NULL;

-- Update fat_free_mass records  
UPDATE withings_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_free_mass' AND source_type = 'withings')
WHERE variable = 'fat_free_mass_kg' AND variable_id IS NULL;

-- Update fat_ratio records
UPDATE withings_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_ratio' AND source_type = 'withings')
WHERE variable = 'fat_ratio' AND variable_id IS NULL;

-- Update fat_mass records
UPDATE withings_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'fat_mass' AND source_type = 'withings')
WHERE variable = 'fat_mass_weight_kg' AND variable_id IS NULL;

-- Update muscle_mass records
UPDATE withings_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'muscle_mass' AND source_type = 'withings')
WHERE variable = 'muscle_mass_kg' AND variable_id IS NULL;

-- Update hydration records
UPDATE withings_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'hydration' AND source_type = 'withings')
WHERE variable = 'hydration_kg' AND variable_id IS NULL;

-- Update bone_mass records
UPDATE withings_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'bone_mass' AND source_type = 'withings')
WHERE variable = 'bone_mass_kg' AND variable_id IS NULL;

-- ============================================================================
-- STEP 4: Clean up orphaned records and add constraints
-- ============================================================================

-- Check for unmapped records first
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM withings_variable_data_points 
    WHERE variable_id IS NULL;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned records that could not be mapped to variables', orphaned_count;
        RAISE NOTICE 'Run this query to see them: SELECT DISTINCT variable FROM withings_variable_data_points WHERE variable_id IS NULL;';
    END IF;
END $$;

-- Delete records that couldn't be mapped (if any)
DELETE FROM withings_variable_data_points 
WHERE variable_id IS NULL;

-- Make variable_id NOT NULL now that all records are updated
ALTER TABLE withings_variable_data_points 
ALTER COLUMN variable_id SET NOT NULL;

-- ============================================================================
-- STEP 5: Update constraints and indexes
-- ============================================================================

-- Drop old unique constraint
ALTER TABLE withings_variable_data_points 
DROP CONSTRAINT IF EXISTS withings_variable_data_points_user_id_date_variable_key;

-- Add new unique constraint
ALTER TABLE withings_variable_data_points 
ADD CONSTRAINT withings_variable_data_points_user_id_date_variable_id_key 
UNIQUE (user_id, date, variable_id);

-- ============================================================================
-- STEP 6: Update indexes
-- ============================================================================

-- Drop old index on variable column
DROP INDEX IF EXISTS idx_withings_variable_data_points_variable;

-- Create new index on variable_id
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_variable_id 
ON withings_variable_data_points(variable_id);

-- ============================================================================
-- STEP 7: OPTIONAL - Drop old variable column
-- ============================================================================

-- Uncomment the next line when you're confident the migration worked:
-- ALTER TABLE withings_variable_data_points DROP COLUMN variable;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

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

-- Check for any remaining records with old variable names (should be 0 after column drop)
SELECT COUNT(*) as remaining_old_records
FROM withings_variable_data_points 
WHERE variable IS NOT NULL; 