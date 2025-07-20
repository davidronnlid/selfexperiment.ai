-- ============================================================================
-- UPDATE VARIABLES TABLE TO REFERENCE UNITS TABLE
-- ============================================================================
-- This script updates the variables table to use foreign key references to the units table

-- First, ensure the units table exists
\i database/create_units_table.sql

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS TO VARIABLES TABLE
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
-- UPDATE EXISTING VARIABLES TO USE VALID UNIT REFERENCES
-- ============================================================================

-- Update variables that have canonical_unit values to ensure they reference valid units
UPDATE variables 
SET canonical_unit = NULL 
WHERE canonical_unit IS NOT NULL 
  AND canonical_unit NOT IN (SELECT id FROM units);

-- Update variables that have default_display_unit values to ensure they reference valid units
UPDATE variables 
SET default_display_unit = NULL 
WHERE default_display_unit IS NOT NULL 
  AND default_display_unit NOT IN (SELECT id FROM units);

-- ============================================================================
-- UPDATE CONVERTIBLE_UNITS TO REFERENCE VALID UNITS
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
-- UPDATE UNIT_GROUP TO MATCH UNITS TABLE
-- ============================================================================

-- Update unit_group to match the unit_group from the units table
UPDATE variables 
SET unit_group = u.unit_group
FROM units u
WHERE variables.canonical_unit = u.id
  AND variables.unit_group IS DISTINCT FROM u.unit_group;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for the foreign key columns
CREATE INDEX IF NOT EXISTS idx_variables_canonical_unit ON variables(canonical_unit);
CREATE INDEX IF NOT EXISTS idx_variables_default_display_unit ON variables(default_display_unit);
CREATE INDEX IF NOT EXISTS idx_variables_unit_group ON variables(unit_group);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT fk_variables_canonical_unit ON variables IS 'References the base unit for this variable from the units table';
COMMENT ON CONSTRAINT fk_variables_default_display_unit ON variables IS 'References the default display unit for this variable from the units table';
COMMENT ON COLUMN variables.unit_group IS 'Unit group from the units table (e.g., mass, temperature, distance)';
COMMENT ON COLUMN variables.convertible_units IS 'Array of unit IDs from the units table that this variable can be displayed in';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check for any variables with invalid unit references
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

-- Show variables with their units
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
ORDER BY v.unit_group, v.slug; 