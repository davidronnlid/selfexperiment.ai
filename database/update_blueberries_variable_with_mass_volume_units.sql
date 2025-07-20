-- ============================================================================
-- UPDATE BLUEBERRIES VARIABLE WITH MASS/VOLUME UNITS SUPPORT
-- ============================================================================
-- This script updates the variable system to support multiple unit types
-- (mass/volume) with user preference handling for the blueberries variable

-- STEP 1: Add volume units to the units table if they don't exist
-- ============================================================================

INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
-- Volume units (metric)
('l', 'Liters', 'L', 'volume', NULL, NULL, true),
('ml', 'Milliliters', 'mL', 'volume', 'l', 0.001, false),
('dl', 'Deciliters', 'dL', 'volume', 'l', 0.1, false),
('cl', 'Centiliters', 'cL', 'volume', 'l', 0.01, false),

-- Volume units (imperial)
('gal', 'Gallons', 'gal', 'volume', 'l', 3.78541, false),
('qt', 'Quarts', 'qt', 'volume', 'l', 0.946353, false),
('pt', 'Pints', 'pt', 'volume', 'l', 0.473176, false),
('cup', 'Cups', 'cup', 'volume', 'l', 0.236588, false),
('fl_oz', 'Fluid Ounces', 'fl oz', 'volume', 'l', 0.0295735, false),
('tbsp', 'Tablespoons', 'tbsp', 'volume', 'l', 0.0147868, false),
('tsp', 'Teaspoons', 'tsp', 'volume', 'l', 0.00492892, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- STEP 2: Update variable_units table to support multiple unit groups
-- ============================================================================

-- Add new columns to variable_units table
ALTER TABLE variable_units 
ADD COLUMN IF NOT EXISTS unit_groups TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_unit_group TEXT DEFAULT NULL;

-- Add comments for the new columns
COMMENT ON COLUMN variable_units.unit_groups IS 'Array of unit groups this variable supports (e.g., ["mass", "volume"])';
COMMENT ON COLUMN variable_units.default_unit_group IS 'Default unit group to use when user has no preference';

-- STEP 3: Update the blueberries variable to support both mass and volume
-- ============================================================================

-- First, find the blueberries variable ID
DO $$
DECLARE
    blueberries_var_id UUID;
    mass_base_unit TEXT;
    volume_base_unit TEXT;
BEGIN
    -- Get blueberries variable ID
    SELECT id INTO blueberries_var_id 
    FROM variables 
    WHERE slug = 'blueberries' 
    LIMIT 1;

    IF blueberries_var_id IS NULL THEN
        RAISE EXCEPTION 'Blueberries variable not found';
    END IF;

    -- Get base units for mass and volume
    SELECT id INTO mass_base_unit FROM units WHERE unit_group = 'mass' AND is_base = true LIMIT 1;
    SELECT id INTO volume_base_unit FROM units WHERE unit_group = 'volume' AND is_base = true LIMIT 1;

    -- Update or insert variable_units record for blueberries
    INSERT INTO variable_units (variable_id, unit_id, unit_groups, default_unit_group, priority, note)
    VALUES (
        blueberries_var_id,
        mass_base_unit, -- Default to mass (kg)
        ARRAY['mass', 'volume'], -- Support both unit groups
        'mass', -- Default to mass
        1,
        'Supports both mass (g, kg, lb, oz) and volume (ml, l, cup, tbsp) measurements'
    )
    ON CONFLICT (variable_id, unit_id) 
    DO UPDATE SET
        unit_groups = EXCLUDED.unit_groups,
        default_unit_group = EXCLUDED.default_unit_group,
        note = EXCLUDED.note;

    RAISE NOTICE 'Updated blueberries variable (%) to support mass and volume units', blueberries_var_id;
END $$;

-- STEP 4: Create functions to get appropriate units for variables
-- ============================================================================

-- Function to get available units for a variable based on supported unit groups
CREATE OR REPLACE FUNCTION get_variable_units(var_id UUID)
RETURNS TABLE(
    unit_id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT,
    is_base BOOLEAN,
    is_default_group BOOLEAN
) AS $$
DECLARE
    var_unit_groups TEXT[];
    default_group TEXT;
BEGIN
    -- Get supported unit groups for this variable
    SELECT vu.unit_groups, vu.default_unit_group 
    INTO var_unit_groups, default_group
    FROM variable_units vu
    WHERE vu.variable_id = var_id
    LIMIT 1;

    -- If no unit groups specified, return empty
    IF var_unit_groups IS NULL THEN
        RETURN;
    END IF;

    -- Return units from all supported groups
    RETURN QUERY
    SELECT 
        u.id,
        u.label,
        u.symbol,
        u.unit_group,
        u.is_base,
        (u.unit_group = default_group) as is_default_group
    FROM units u
    WHERE u.unit_group = ANY(var_unit_groups)
    ORDER BY 
        (u.unit_group = default_group) DESC, -- Default group first
        u.unit_group,
        u.is_base DESC, -- Base unit first within each group
        u.label;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user's preferred unit for a variable
CREATE OR REPLACE FUNCTION get_user_preferred_unit(
    user_id_param UUID,
    variable_id_param UUID
)
RETURNS TABLE(
    unit_id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT
) AS $$
DECLARE
    user_display_unit JSONB;
    preferred_unit_id TEXT;
    preferred_group TEXT;
    default_group TEXT;
    default_unit_id TEXT;
BEGIN
    -- Get user's display unit preference
    SELECT uvp.display_unit INTO user_display_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_id_param 
    AND uvp.variable_id = variable_id_param;

    -- Extract preferred unit from display_unit JSON
    IF user_display_unit IS NOT NULL THEN
        preferred_unit_id := user_display_unit->>'unit_id';
        preferred_group := user_display_unit->>'unit_group';
    END IF;

    -- If user has a preference and unit exists, return it
    IF preferred_unit_id IS NOT NULL THEN
        RETURN QUERY
        SELECT u.id, u.label, u.symbol, u.unit_group
        FROM units u
        WHERE u.id = preferred_unit_id
        LIMIT 1;
        
        -- If we found the preferred unit, return it
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;

    -- Fall back to default unit group base unit
    SELECT vu.default_unit_group INTO default_group
    FROM variable_units vu
    WHERE vu.variable_id = variable_id_param
    LIMIT 1;

    -- Get base unit for default group
    IF default_group IS NOT NULL THEN
        SELECT u.id INTO default_unit_id
        FROM units u
        WHERE u.unit_group = default_group AND u.is_base = true
        LIMIT 1;

        IF default_unit_id IS NOT NULL THEN
            RETURN QUERY
            SELECT u.id, u.label, u.symbol, u.unit_group
            FROM units u
            WHERE u.id = default_unit_id;
            RETURN;
        END IF;
    END IF;

    -- Final fallback: return any unit associated with the variable
    RETURN QUERY
    SELECT u.id, u.label, u.symbol, u.unit_group
    FROM units u
    JOIN variable_units vu ON u.id = vu.unit_id
    WHERE vu.variable_id = variable_id_param
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- STEP 5: Create a function to update user unit preferences
-- ============================================================================

CREATE OR REPLACE FUNCTION set_user_unit_preference(
    user_id_param UUID,
    variable_id_param UUID,
    unit_id_param TEXT,
    unit_group_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    unit_group_val TEXT;
BEGIN
    -- Get unit group if not provided
    IF unit_group_param IS NULL THEN
        SELECT u.unit_group INTO unit_group_val
        FROM units u
        WHERE u.id = unit_id_param;
    ELSE
        unit_group_val := unit_group_param;
    END IF;

    -- Update or insert user preference
    INSERT INTO user_variable_preferences (user_id, variable_id, display_unit, is_shared)
    VALUES (
        user_id_param,
        variable_id_param,
        jsonb_build_object(
            'unit_id', unit_id_param,
            'unit_group', unit_group_val
        ),
        false -- Default to not shared
    )
    ON CONFLICT (user_id, variable_id)
    DO UPDATE SET
        display_unit = jsonb_build_object(
            'unit_id', unit_id_param,
            'unit_group', unit_group_val
        ),
        updated_at = NOW();

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Test the setup
-- ============================================================================

-- Show available units for blueberries variable
SELECT 'Available units for blueberries variable:' as info;
SELECT * FROM get_variable_units(
    (SELECT id FROM variables WHERE slug = 'blueberries' LIMIT 1)
);

-- Show base units for mass and volume
SELECT 'Base units:' as info;
SELECT unit_group, id, label, symbol 
FROM units 
WHERE is_base = true AND unit_group IN ('mass', 'volume')
ORDER BY unit_group;

-- Verify the variable_units entry
SELECT 'Variable units configuration:' as info;
SELECT 
    v.slug,
    v.label,
    vu.unit_id,
    vu.unit_groups,
    vu.default_unit_group,
    vu.note
FROM variables v
JOIN variable_units vu ON v.id = vu.variable_id
WHERE v.slug = 'blueberries';

SELECT '✅ Blueberries variable now supports both mass and volume units!' as result; 