-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS BETWEEN VARIABLES AND UNITS TABLES
-- ============================================================================
-- Run this script in your Supabase SQL Editor
-- Note: This assumes the units table already exists

-- ============================================================================
-- STEP 1: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraint for canonical_unit
-- Note: Using ON DELETE SET NULL to prevent deletion of units that are referenced
ALTER TABLE variables 
ADD CONSTRAINT fk_variables_canonical_unit 
FOREIGN KEY (canonical_unit) REFERENCES units(id) ON DELETE SET NULL;

-- Add foreign key constraint for default_display_unit
ALTER TABLE variables 
ADD CONSTRAINT fk_variables_default_display_unit 
FOREIGN KEY (default_display_unit) REFERENCES units(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for the foreign key columns (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_variables_canonical_unit ON variables(canonical_unit);
CREATE INDEX IF NOT EXISTS idx_variables_default_display_unit ON variables(default_display_unit);
CREATE INDEX IF NOT EXISTS idx_variables_unit_group ON variables(unit_group);

-- ============================================================================
-- STEP 3: UPDATE EXISTING VARIABLES TO USE VALID UNIT REFERENCES
-- ============================================================================

-- First, let's see what units we have in the units table that match current variable units
SELECT 'Current canonical_unit values in variables table:' as info;
SELECT DISTINCT canonical_unit, COUNT(*) as variable_count
FROM variables 
WHERE canonical_unit IS NOT NULL 
GROUP BY canonical_unit 
ORDER BY variable_count DESC;

-- Check which units in variables table don't exist in units table
SELECT 'Canonical units that do not exist in units table:' as info;
SELECT DISTINCT canonical_unit 
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Update variables that have canonical_unit values that don't exist in units table
-- We'll set them to NULL first, then you can manually update them to valid unit IDs
UPDATE variables 
SET canonical_unit = NULL 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Update variables that have default_display_unit values that don't exist in units table
UPDATE variables 
SET default_display_unit = NULL 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- ============================================================================
-- STEP 4: CLEAN UP CONVERTIBLE_UNITS JSONB ARRAY
-- ============================================================================

-- Function to clean convertible_units JSONB to only include valid unit IDs
CREATE OR REPLACE FUNCTION clean_convertible_units()
RETURNS void AS $$
DECLARE
    var_record RECORD;
    valid_units TEXT[];
    unit_id TEXT;
BEGIN
    FOR var_record IN SELECT id, convertible_units FROM variables WHERE convertible_units IS NOT NULL LOOP
        valid_units := ARRAY[]::TEXT[];
        
        -- Check each unit in convertible_units
        FOR unit_id IN SELECT jsonb_array_elements_text(var_record.convertible_units) LOOP
            IF EXISTS (SELECT 1 FROM units WHERE id = unit_id) THEN
                valid_units := array_append(valid_units, unit_id);
            END IF;
        END LOOP;
        
        -- Update the variable with only valid units
        IF array_length(valid_units, 1) > 0 THEN
            UPDATE variables 
            SET convertible_units = to_jsonb(valid_units)
            WHERE id = var_record.id;
        ELSE
            UPDATE variables 
            SET convertible_units = NULL
            WHERE id = var_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to clean convertible_units
SELECT clean_convertible_units();

-- Drop the temporary function
DROP FUNCTION clean_convertible_units();

-- ============================================================================
-- STEP 5: UPDATE UNIT_GROUP TO MATCH UNITS TABLE
-- ============================================================================

-- Update unit_group to match the unit_group from the units table based on canonical_unit
UPDATE variables 
SET unit_group = u.unit_group
FROM units u
WHERE variables.canonical_unit = u.id
  AND (variables.unit_group IS NULL OR variables.unit_group != u.unit_group);

-- ============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT fk_variables_canonical_unit ON variables IS 'References the base unit for this variable from the units table';
COMMENT ON CONSTRAINT fk_variables_default_display_unit ON variables IS 'References the default display unit for this variable from the units table';
COMMENT ON COLUMN variables.unit_group IS 'Unit group from the units table (e.g., mass, temperature, distance)';
COMMENT ON COLUMN variables.convertible_units IS 'Array of unit IDs from the units table that this variable can be displayed in';

-- ============================================================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================================================

-- Show all units available in the units table
SELECT 'All available units in the units table:' as info;
SELECT unit_group, id, label, symbol, is_base 
FROM units 
ORDER BY unit_group, is_base DESC, label;

-- Check for any variables with invalid unit references (should return 0 rows after cleanup)
SELECT 'Variables with invalid unit references (should be empty):' as info;
SELECT 
    v.id,
    v.slug,
    v.canonical_unit,
    v.default_display_unit,
    v.unit_group
FROM variables v
WHERE (v.canonical_unit IS NOT NULL AND v.canonical_unit NOT IN (SELECT id FROM units))
   OR (v.default_display_unit IS NOT NULL AND v.default_display_unit NOT IN (SELECT id FROM units));

-- Show summary of variables by unit group
SELECT 'Variables summary by unit group:' as info;
SELECT 
    v.unit_group,
    COUNT(*) as variable_count
FROM variables v
WHERE v.unit_group IS NOT NULL
GROUP BY v.unit_group
ORDER BY variable_count DESC;

-- Show variables with their units (first 10)
SELECT 'Sample variables with their unit relationships:' as info;
SELECT 
    v.slug,
    v.label,
    v.canonical_unit,
    u_canonical.label as canonical_unit_label,
    v.default_display_unit,
    u_display.label as default_display_unit_label,
    v.unit_group
FROM variables v
LEFT JOIN units u_canonical ON v.canonical_unit = u_canonical.id
LEFT JOIN units u_display ON v.default_display_unit = u_display.id
WHERE v.canonical_unit IS NOT NULL OR v.default_display_unit IS NOT NULL
ORDER BY v.unit_group, v.slug
LIMIT 10; 