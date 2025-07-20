-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS BETWEEN VARIABLES AND UNITS TABLES
-- ============================================================================
-- Run this script in your Supabase SQL Editor

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
SELECT DISTINCT canonical_unit, COUNT(*) as variable_count
FROM variables 
WHERE canonical_unit IS NOT NULL 
GROUP BY canonical_unit 
ORDER BY variable_count DESC;

-- Check which units in variables table don't exist in units table
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
-- STEP 4: UPDATE UNIT_GROUP TO MATCH UNITS TABLE
-- ============================================================================

-- Update unit_group to match the unit_group from the units table based on canonical_unit
UPDATE variables 
SET unit_group = u.unit_group
FROM units u
WHERE variables.canonical_unit = u.id
  AND (variables.unit_group IS NULL OR variables.unit_group != u.unit_group);

-- ============================================================================
-- STEP 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT fk_variables_canonical_unit ON variables IS 'References the base unit for this variable from the units table';
COMMENT ON CONSTRAINT fk_variables_default_display_unit ON variables IS 'References the default display unit for this variable from the units table';
COMMENT ON COLUMN variables.unit_group IS 'Unit group from the units table (e.g., mass, temperature, distance)';
COMMENT ON COLUMN variables.convertible_units IS 'Array of unit IDs from the units table that this variable can be displayed in';

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Show all units available in the units table
SELECT unit_group, id, label, symbol, is_base 
FROM units 
ORDER BY unit_group, is_base DESC, label;

-- Check for any variables with invalid unit references (should return 0 rows after cleanup)
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
SELECT 
    v.unit_group,
    COUNT(*) as variable_count
FROM variables v
WHERE v.unit_group IS NOT NULL
GROUP BY v.unit_group
ORDER BY variable_count DESC;

-- Show variables with their units (first 10)
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