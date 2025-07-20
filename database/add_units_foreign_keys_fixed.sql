-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS BETWEEN VARIABLES AND UNITS TABLES
-- ============================================================================
-- Run this script in your Supabase SQL Editor
-- Note: This assumes the units table already exists
-- IMPORTANT: This version cleans up data BEFORE adding constraints

-- ============================================================================
-- STEP 1: ANALYZE CURRENT DATA
-- ============================================================================

-- Show all units available in the units table
SELECT 'All available units in the units table:' as info;
SELECT unit_group, id, label, symbol, is_base 
FROM units 
ORDER BY unit_group, is_base DESC, label;

-- Show current canonical_unit values in variables table
SELECT 'Current canonical_unit values in variables table:' as info;
SELECT DISTINCT canonical_unit, COUNT(*) as variable_count
FROM variables 
WHERE canonical_unit IS NOT NULL 
GROUP BY canonical_unit 
ORDER BY variable_count DESC;

-- Check which units in variables table don't exist in units table
SELECT 'Canonical units that do NOT exist in units table (will be cleaned up):' as info;
SELECT DISTINCT canonical_unit 
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Check default_display_unit issues
SELECT 'Default display units that do NOT exist in units table (will be cleaned up):' as info;
SELECT DISTINCT default_display_unit 
FROM variables 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- ============================================================================
-- STEP 2: CLEAN UP INVALID UNIT REFERENCES BEFORE ADDING CONSTRAINTS
-- ============================================================================

-- Store the count of variables that will be affected
SELECT 'Number of variables with invalid canonical_unit that will be cleaned:' as info,
       COUNT(*) as count
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Update variables that have canonical_unit values that don't exist in units table
UPDATE variables 
SET canonical_unit = NULL 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Store the count of variables that will be affected for display_unit
SELECT 'Number of variables with invalid default_display_unit that will be cleaned:' as info,
       COUNT(*) as count
FROM variables 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- Update variables that have default_display_unit values that don't exist in units table
UPDATE variables 
SET default_display_unit = NULL 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- ============================================================================
-- STEP 3: CLEAN UP CONVERTIBLE_UNITS JSONB ARRAY
-- ============================================================================

-- Function to clean convertible_units JSONB to only include valid unit IDs
CREATE OR REPLACE FUNCTION clean_convertible_units()
RETURNS TABLE(variables_updated INTEGER, invalid_units_removed TEXT[]) AS $$
DECLARE
    var_record RECORD;
    valid_units TEXT[];
    invalid_units TEXT[];
    unit_id TEXT;
    updated_count INTEGER := 0;
    all_invalid_units TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR var_record IN SELECT id, convertible_units FROM variables WHERE convertible_units IS NOT NULL LOOP
        valid_units := ARRAY[]::TEXT[];
        invalid_units := ARRAY[]::TEXT[];
        
        -- Check each unit in convertible_units
        FOR unit_id IN SELECT jsonb_array_elements_text(var_record.convertible_units) LOOP
            IF EXISTS (SELECT 1 FROM units WHERE id = unit_id) THEN
                valid_units := array_append(valid_units, unit_id);
            ELSE
                invalid_units := array_append(invalid_units, unit_id);
                all_invalid_units := array_append(all_invalid_units, unit_id);
            END IF;
        END LOOP;
        
        -- Update the variable if there were invalid units
        IF array_length(invalid_units, 1) > 0 THEN
            updated_count := updated_count + 1;
            IF array_length(valid_units, 1) > 0 THEN
                UPDATE variables 
                SET convertible_units = to_jsonb(valid_units)
                WHERE id = var_record.id;
            ELSE
                UPDATE variables 
                SET convertible_units = NULL
                WHERE id = var_record.id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT updated_count, array_remove(array_agg(DISTINCT unnest), NULL) 
    FROM unnest(all_invalid_units) unnest;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to clean convertible_units and show results
SELECT 'Convertible units cleanup results:' as info;
SELECT * FROM clean_convertible_units();

-- Drop the temporary function
DROP FUNCTION clean_convertible_units();

-- ============================================================================
-- STEP 4: VERIFY CLEANUP COMPLETED
-- ============================================================================

-- Verify no invalid references remain
SELECT 'Verification - these should return 0 rows:' as info;

SELECT 'Invalid canonical_unit references remaining:' as check_type, COUNT(*) as count
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units)
UNION ALL
SELECT 'Invalid default_display_unit references remaining:' as check_type, COUNT(*) as count
FROM variables 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- ============================================================================
-- STEP 5: NOW ADD FOREIGN KEY CONSTRAINTS (SHOULD WORK NOW)
-- ============================================================================

-- Add foreign key constraint for canonical_unit
ALTER TABLE variables 
ADD CONSTRAINT fk_variables_canonical_unit 
FOREIGN KEY (canonical_unit) REFERENCES units(id) ON DELETE SET NULL;

-- Add foreign key constraint for default_display_unit
ALTER TABLE variables 
ADD CONSTRAINT fk_variables_default_display_unit 
FOREIGN KEY (default_display_unit) REFERENCES units(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for the foreign key columns (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_variables_canonical_unit ON variables(canonical_unit);
CREATE INDEX IF NOT EXISTS idx_variables_default_display_unit ON variables(default_display_unit);
CREATE INDEX IF NOT EXISTS idx_variables_unit_group ON variables(unit_group);

-- ============================================================================
-- STEP 7: UPDATE UNIT_GROUP TO MATCH UNITS TABLE
-- ============================================================================

-- Update unit_group to match the unit_group from the units table based on canonical_unit
UPDATE variables 
SET unit_group = u.unit_group
FROM units u
WHERE variables.canonical_unit = u.id
  AND (variables.unit_group IS NULL OR variables.unit_group != u.unit_group);

-- ============================================================================
-- STEP 8: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT fk_variables_canonical_unit ON variables IS 'References the base unit for this variable from the units table';
COMMENT ON CONSTRAINT fk_variables_default_display_unit ON variables IS 'References the default display unit for this variable from the units table';
COMMENT ON COLUMN variables.unit_group IS 'Unit group from the units table (e.g., mass, temperature, distance)';
COMMENT ON COLUMN variables.convertible_units IS 'Array of unit IDs from the units table that this variable can be displayed in';

-- ============================================================================
-- STEP 9: FINAL VERIFICATION QUERIES
-- ============================================================================

-- Check for any variables with invalid unit references (should return 0 rows)
SELECT 'FINAL CHECK - Variables with invalid unit references (should be empty):' as info;
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
    COALESCE(v.unit_group, 'NULL') as unit_group,
    COUNT(*) as variable_count
FROM variables v
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
ORDER BY v.unit_group, v.slug
LIMIT 10;

-- Success message
SELECT '✅ SUCCESS: Foreign key constraints have been added successfully!' as result;
SELECT 'Your variables table now properly references the units table.' as result; 