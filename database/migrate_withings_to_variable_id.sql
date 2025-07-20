-- Migration: Update withings_variable_data_points to use variable_id
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
-- STEP 3: Create mapping table for old variable names to new variable_id
-- ============================================================================

-- Create temporary view to map old variable names to new variable IDs
CREATE OR REPLACE VIEW withings_variable_mapping AS
SELECT 
  v.id as variable_id,
  v.slug,
  CASE v.slug
    WHEN 'weight' THEN 'weight_kg'
    WHEN 'fat_free_mass' THEN 'fat_free_mass_kg'
    WHEN 'fat_ratio' THEN 'fat_ratio'
    WHEN 'fat_mass' THEN 'fat_mass_weight_kg'
    WHEN 'muscle_mass' THEN 'muscle_mass_kg'
    WHEN 'hydration' THEN 'hydration_kg'
    WHEN 'bone_mass' THEN 'bone_mass_kg'
  END as old_variable_name
FROM variables v
WHERE v.source_type = 'withings';

-- ============================================================================
-- STEP 4: Update existing data to use variable_id
-- ============================================================================

-- Update records with variable_id based on old variable names
UPDATE withings_variable_data_points AS wd
SET variable_id = wvm.variable_id
FROM withings_variable_mapping wvm
WHERE wd.variable = wvm.old_variable_name  -- Compare text variable with text old_variable_name
AND wd.variable_id IS NULL;

-- ============================================================================
-- STEP 5: Clean up orphaned records and add constraints
-- ============================================================================

-- Delete records that couldn't be mapped (if any)
DELETE FROM withings_variable_data_points 
WHERE variable_id IS NULL;

-- Make variable_id NOT NULL now that all records are updated
ALTER TABLE withings_variable_data_points 
ALTER COLUMN variable_id SET NOT NULL;

-- ============================================================================
-- STEP 6: Update constraints and indexes
-- ============================================================================

-- Drop old unique constraint
ALTER TABLE withings_variable_data_points 
DROP CONSTRAINT IF EXISTS withings_variable_data_points_user_id_date_variable_key;

-- Add new unique constraint
ALTER TABLE withings_variable_data_points 
ADD CONSTRAINT withings_variable_data_points_user_id_date_variable_id_key 
UNIQUE (user_id, date, variable_id);

-- Drop old variable column (after confirming migration is successful)
-- Uncomment the next line when you're confident the migration worked:
-- ALTER TABLE withings_variable_data_points DROP COLUMN variable;

-- ============================================================================
-- STEP 7: Update indexes
-- ============================================================================

-- Drop old index on variable column
DROP INDEX IF EXISTS idx_withings_variable_data_points_variable;

-- Create new index on variable_id
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_variable_id 
ON withings_variable_data_points(variable_id);

-- ============================================================================
-- STEP 8: Clean up temporary view
-- ============================================================================

DROP VIEW IF EXISTS withings_variable_mapping;

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

-- Check for any remaining records with old variable names (should be 0)
SELECT COUNT(*) as remaining_old_records
FROM withings_variable_data_points 
WHERE variable IS NOT NULL; 