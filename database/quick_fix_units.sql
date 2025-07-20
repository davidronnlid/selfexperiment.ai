-- ============================================================================
-- QUICK FIX FOR UNITS FOREIGN KEY ISSUE
-- ============================================================================
-- This script addresses the specific "minutes" issue

-- ============================================================================
-- STEP 1: CHECK WHAT'S IN YOUR UNITS TABLE
-- ============================================================================

SELECT '=== WHAT UNITS DO YOU HAVE? ===' as info;
SELECT id, label, symbol, unit_group, is_base 
FROM units 
ORDER BY unit_group, is_base DESC, label;

-- ============================================================================
-- STEP 2: CHECK WHAT'S CAUSING THE ERROR
-- ============================================================================

SELECT '=== VARIABLES WITH canonical_unit=minutes ===' as info;
SELECT id, slug, label, canonical_unit, default_display_unit, unit_group
FROM variables 
WHERE canonical_unit = 'minutes';

SELECT '=== ALL INVALID CANONICAL_UNIT VALUES ===' as info;
SELECT DISTINCT canonical_unit, COUNT(*) as variable_count
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units)
GROUP BY canonical_unit
ORDER BY variable_count DESC;

-- ============================================================================
-- STEP 3: DROP THE PROBLEMATIC CONSTRAINTS
-- ============================================================================

-- Drop the constraints that are causing the error
ALTER TABLE variables DROP CONSTRAINT IF EXISTS fk_variables_canonical_unit;
ALTER TABLE variables DROP CONSTRAINT IF EXISTS fk_variables_default_display_unit;

SELECT '✅ Dropped foreign key constraints' as status;

-- ============================================================================
-- STEP 4: FIX THE DATA
-- ============================================================================

-- Option 1: Set all invalid units to NULL
SELECT '=== SETTING INVALID UNITS TO NULL ===' as info;

UPDATE variables 
SET canonical_unit = NULL 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

UPDATE variables 
SET default_display_unit = NULL 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

SELECT '✅ Set invalid unit references to NULL' as status;

-- ============================================================================
-- STEP 5: VERIFY THE FIX
-- ============================================================================

SELECT '=== VERIFICATION - SHOULD BE EMPTY ===' as info;
SELECT 
    'Invalid canonical_unit' as check_type, 
    COUNT(*) as count
FROM variables 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units)
UNION ALL
SELECT 
    'Invalid default_display_unit' as check_type, 
    COUNT(*) as count
FROM variables 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- ============================================================================
-- STEP 6: NOW ADD THE CONSTRAINTS BACK
-- ============================================================================

SELECT '=== ADDING FOREIGN KEY CONSTRAINTS ===' as info;

ALTER TABLE variables 
ADD CONSTRAINT fk_variables_canonical_unit 
FOREIGN KEY (canonical_unit) REFERENCES units(id) ON DELETE SET NULL;

ALTER TABLE variables 
ADD CONSTRAINT fk_variables_default_display_unit 
FOREIGN KEY (default_display_unit) REFERENCES units(id) ON DELETE SET NULL;

SELECT '✅ Successfully added foreign key constraints!' as status;

-- ============================================================================
-- STEP 7: FINAL CHECK
-- ============================================================================

SELECT '=== FINAL VERIFICATION ===' as info;
SELECT 
    v.slug,
    v.label,
    v.canonical_unit,
    u.label as unit_label,
    v.unit_group
FROM variables v
LEFT JOIN units u ON v.canonical_unit = u.id
WHERE v.canonical_unit IS NOT NULL
ORDER BY v.unit_group, v.slug
LIMIT 10;

SELECT '🎉 SUCCESS! Your variables table now properly references the units table!' as result; 