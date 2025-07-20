-- ============================================================================
-- FIX UNITS FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- This script handles the case where constraints were partially added
-- and are now preventing data cleanup

-- ============================================================================
-- STEP 1: DROP EXISTING CONSTRAINTS (IF THEY EXIST)
-- ============================================================================

-- Drop foreign key constraints if they exist (won't error if they don't exist)
DO $$ 
BEGIN
    -- Drop canonical_unit constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_variables_canonical_unit' 
               AND table_name = 'variables') THEN
        ALTER TABLE variables DROP CONSTRAINT fk_variables_canonical_unit;
        RAISE NOTICE 'Dropped fk_variables_canonical_unit constraint';
    ELSE
        RAISE NOTICE 'fk_variables_canonical_unit constraint does not exist';
    END IF;
    
    -- Drop default_display_unit constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_variables_default_display_unit' 
               AND table_name = 'variables') THEN
        ALTER TABLE variables DROP CONSTRAINT fk_variables_default_display_unit;
        RAISE NOTICE 'Dropped fk_variables_default_display_unit constraint';
    ELSE
        RAISE NOTICE 'fk_variables_default_display_unit constraint does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: ANALYZE CURRENT DATA
-- ============================================================================

-- Show all units available in the units table
SELECT '=== UNITS AVAILABLE IN UNITS TABLE ===' as info;
SELECT unit_group, id, label, symbol, is_base 
FROM units 
ORDER BY unit_group, is_base DESC, label;

-- Show current canonical_unit values in variables table
SELECT '=== CURRENT CANONICAL_UNIT VALUES IN VARIABLES ===' as info;
SELECT DISTINCT canonical_unit, COUNT(*) as variable_count
FROM variables 
WHERE canonical_unit IS NOT NULL 
GROUP BY canonical_unit 
ORDER BY variable_count DESC;

-- Check which units in variables table don't exist in units table
SELECT '=== INVALID CANONICAL_UNIT VALUES (WILL BE FIXED) ===' as info;
SELECT DISTINCT canonical_unit, COUNT(*) as affected_variables
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units)
GROUP BY canonical_unit
ORDER BY affected_variables DESC;

-- Check default_display_unit issues
SELECT '=== INVALID DEFAULT_DISPLAY_UNIT VALUES (WILL BE FIXED) ===' as info;
SELECT DISTINCT default_display_unit, COUNT(*) as affected_variables
FROM variables 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units)
GROUP BY default_display_unit
ORDER BY affected_variables DESC;

-- ============================================================================
-- STEP 3: CREATE MAPPING FOR COMMON UNIT FIXES
-- ============================================================================

-- Let's try to map common units to their correct IDs in the units table
-- First, let's see what we're working with

-- Show variables with 'minutes' canonical_unit
SELECT '=== VARIABLES WITH canonical_unit=minutes ===' as info;
SELECT id, slug, label, canonical_unit, default_display_unit, unit_group
FROM variables 
WHERE canonical_unit = 'minutes'
LIMIT 5;

-- ============================================================================
-- STEP 4: FIX INVALID UNIT REFERENCES
-- ============================================================================

-- Option A: Set invalid units to NULL
SELECT '=== CLEANING UP INVALID CANONICAL_UNIT VALUES ===' as info;

-- Count what will be affected
SELECT 'Variables with invalid canonical_unit that will be set to NULL:' as action,
       COUNT(*) as count
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Update variables that have canonical_unit values that don't exist in units table
UPDATE variables 
SET canonical_unit = NULL 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Count what will be affected for default_display_unit
SELECT 'Variables with invalid default_display_unit that will be set to NULL:' as action,
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
-- STEP 5: CLEAN UP CONVERTIBLE_UNITS JSONB ARRAY
-- ============================================================================

SELECT '=== CLEANING UP CONVERTIBLE_UNITS ARRAYS ===' as info;

-- Create a function to clean convertible_units
CREATE OR REPLACE FUNCTION clean_convertible_units_safe()
RETURNS TABLE(
    variables_processed INTEGER, 
    variables_updated INTEGER, 
    invalid_units_found TEXT[]
) AS $$
DECLARE
    var_record RECORD;
    valid_units TEXT[];
    invalid_units_in_var TEXT[];
    unit_id TEXT;
    processed_count INTEGER := 0;
    updated_count INTEGER := 0;
    all_invalid_units TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR var_record IN SELECT id, slug, convertible_units FROM variables WHERE convertible_units IS NOT NULL LOOP
        processed_count := processed_count + 1;
        valid_units := ARRAY[]::TEXT[];
        invalid_units_in_var := ARRAY[]::TEXT[];
        
        -- Check each unit in convertible_units
        FOR unit_id IN SELECT jsonb_array_elements_text(var_record.convertible_units) LOOP
            IF EXISTS (SELECT 1 FROM units WHERE id = unit_id) THEN
                valid_units := array_append(valid_units, unit_id);
            ELSE
                invalid_units_in_var := array_append(invalid_units_in_var, unit_id);
                -- Add to global list if not already there
                IF NOT (unit_id = ANY(all_invalid_units)) THEN
                    all_invalid_units := array_append(all_invalid_units, unit_id);
                END IF;
            END IF;
        END LOOP;
        
        -- Update the variable if there were changes
        IF array_length(invalid_units_in_var, 1) > 0 THEN
            updated_count := updated_count + 1;
            IF array_length(valid_units, 1) > 0 THEN
                UPDATE variables 
                SET convertible_units = to_jsonb(valid_units)
                WHERE id = var_record.id;
                RAISE NOTICE 'Updated variable % (%) - removed invalid units: %', 
                    var_record.slug, var_record.id, array_to_string(invalid_units_in_var, ', ');
            ELSE
                UPDATE variables 
                SET convertible_units = NULL
                WHERE id = var_record.id;
                RAISE NOTICE 'Set convertible_units to NULL for variable % (%) - all units were invalid', 
                    var_record.slug, var_record.id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT processed_count, updated_count, all_invalid_units;
END;
$$ LANGUAGE plpgsql;

-- Execute the cleanup function
SELECT * FROM clean_convertible_units_safe();

-- Drop the function
DROP FUNCTION clean_convertible_units_safe();

-- ============================================================================
-- STEP 6: VERIFY ALL CLEANUP IS COMPLETE
-- ============================================================================

SELECT '=== VERIFICATION - SHOULD ALL BE ZERO ===' as info;

SELECT 
    'Invalid canonical_unit references' as check_type, 
    COUNT(*) as count
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units)
UNION ALL
SELECT 
    'Invalid default_display_unit references' as check_type, 
    COUNT(*) as count
FROM variables 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- ============================================================================
-- STEP 7: ADD FOREIGN KEY CONSTRAINTS (SHOULD WORK NOW)
-- ============================================================================

SELECT '=== ADDING FOREIGN KEY CONSTRAINTS ===' as info;

-- Add foreign key constraint for canonical_unit
ALTER TABLE variables 
ADD CONSTRAINT fk_variables_canonical_unit 
FOREIGN KEY (canonical_unit) REFERENCES units(id) ON DELETE SET NULL;

-- Add foreign key constraint for default_display_unit
ALTER TABLE variables 
ADD CONSTRAINT fk_variables_default_display_unit 
FOREIGN KEY (default_display_unit) REFERENCES units(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 8: CREATE INDEXES AND FINALIZE
-- ============================================================================

-- Create indexes for the foreign key columns
CREATE INDEX IF NOT EXISTS idx_variables_canonical_unit ON variables(canonical_unit);
CREATE INDEX IF NOT EXISTS idx_variables_default_display_unit ON variables(default_display_unit);
CREATE INDEX IF NOT EXISTS idx_variables_unit_group ON variables(unit_group);

-- Update unit_group to match the units table
UPDATE variables 
SET unit_group = u.unit_group
FROM units u
WHERE variables.canonical_unit = u.id
  AND (variables.unit_group IS NULL OR variables.unit_group != u.unit_group);

-- Add documentation comments
COMMENT ON CONSTRAINT fk_variables_canonical_unit ON variables IS 'References the base unit for this variable from the units table';
COMMENT ON CONSTRAINT fk_variables_default_display_unit ON variables IS 'References the default display unit for this variable from the units table';
COMMENT ON COLUMN variables.unit_group IS 'Unit group from the units table (e.g., mass, temperature, distance)';
COMMENT ON COLUMN variables.convertible_units IS 'Array of unit IDs from the units table that this variable can be displayed in';

-- ============================================================================
-- STEP 9: FINAL VERIFICATION AND SUMMARY
-- ============================================================================

SELECT '=== FINAL VERIFICATION ===' as info;

-- This should return 0 rows
SELECT 
    v.id,
    v.slug,
    v.canonical_unit,
    v.default_display_unit
FROM variables v
WHERE (v.canonical_unit IS NOT NULL AND v.canonical_unit NOT IN (SELECT id FROM units))
   OR (v.default_display_unit IS NOT NULL AND v.default_display_unit NOT IN (SELECT id FROM units));

-- Show summary
SELECT '=== SUMMARY ===' as info;
SELECT 
    COALESCE(v.unit_group, 'No unit group') as unit_group,
    COUNT(*) as variable_count,
    COUNT(v.canonical_unit) as with_canonical_unit,
    COUNT(v.default_display_unit) as with_display_unit
FROM variables v
GROUP BY v.unit_group
ORDER BY variable_count DESC;

-- Show sample of properly linked variables
SELECT '=== SAMPLE VARIABLES WITH PROPER UNIT LINKS ===' as info;
SELECT 
    v.slug,
    v.label,
    v.canonical_unit,
    u_canonical.label as canonical_unit_label,
    v.unit_group
FROM variables v
LEFT JOIN units u_canonical ON v.canonical_unit = u_canonical.id
WHERE v.canonical_unit IS NOT NULL
ORDER BY v.unit_group, v.slug
LIMIT 10;

SELECT '🎉 SUCCESS! Foreign key constraints have been successfully added!' as result;
SELECT 'Your variables table now properly references the units table.' as result; 