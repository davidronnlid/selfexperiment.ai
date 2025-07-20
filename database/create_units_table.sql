-- ============================================================================
-- UNITS TABLE
-- ============================================================================
-- This table stores all available units for variables with their conversion factors

CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY, -- Unit identifier (e.g., "kg", "lb", "°C")
    label TEXT NOT NULL, -- Human-readable label (e.g., "Kilograms", "Pounds", "Celsius")
    symbol TEXT NOT NULL, -- Symbol for display (e.g., "kg", "lb", "°C")
    unit_group TEXT NOT NULL, -- Group for conversion (e.g., "mass", "temperature", "distance")
    conversion_to TEXT, -- What unit this converts to (e.g., "kg" for "lb")
    conversion_factor NUMERIC, -- Conversion factor to the target unit
    is_base BOOLEAN DEFAULT false, -- Whether this is the base unit for its group
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT units_id_check CHECK (id IS NOT NULL AND id != ''),
    CONSTRAINT units_label_check CHECK (label IS NOT NULL AND label != ''),
    CONSTRAINT units_symbol_check CHECK (symbol IS NOT NULL AND symbol != ''),
    CONSTRAINT units_group_check CHECK (unit_group IS NOT NULL AND unit_group != ''),
    CONSTRAINT units_conversion_factor_check CHECK (conversion_factor IS NULL OR conversion_factor > 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_units_unit_group ON units(unit_group);
CREATE INDEX IF NOT EXISTS idx_units_is_base ON units(is_base);
CREATE INDEX IF NOT EXISTS idx_units_conversion_to ON units(conversion_to);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_units_updated_at
    BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Mass units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('kg', 'Kilograms', 'kg', 'mass', NULL, NULL, true),
('lb', 'Pounds', 'lb', 'mass', 'kg', 0.453592, false),
('g', 'Grams', 'g', 'mass', 'kg', 0.001, false),
('oz', 'Ounces', 'oz', 'mass', 'kg', 0.0283495, false),
('mg', 'Milligrams', 'mg', 'mass', 'kg', 0.000001, false),
('mcg', 'Micrograms', 'mcg', 'mass', 'kg', 0.000000001, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Distance units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('m', 'Meters', 'm', 'distance', NULL, NULL, true),
('km', 'Kilometers', 'km', 'distance', 'm', 1000, false),
('mi', 'Miles', 'mi', 'distance', 'm', 1609.34, false),
('ft', 'Feet', 'ft', 'distance', 'm', 0.3048, false),
('cm', 'Centimeters', 'cm', 'distance', 'm', 0.01, false),
('in', 'Inches', 'in', 'distance', 'm', 0.0254, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Time units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('hours', 'Hours', 'hr', 'time', NULL, NULL, true),
('minutes', 'Minutes', 'min', 'time', 'hours', 0.0166667, false),
('seconds', 'Seconds', 'sec', 'time', 'hours', 0.000277778, false),
('days', 'Days', 'days', 'time', 'hours', 24, false),
('weeks', 'Weeks', 'weeks', 'time', 'hours', 168, false),
('months', 'Months', 'months', 'time', 'hours', 730.484, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Temperature units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('°C', 'Celsius', '°C', 'temperature', NULL, NULL, true),
('°F', 'Fahrenheit', '°F', 'temperature', '°C', NULL, false),
('K', 'Kelvin', 'K', 'temperature', '°C', NULL, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Volume units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('L', 'Liters', 'L', 'volume', NULL, NULL, true),
('ml', 'Milliliters', 'ml', 'volume', 'L', 0.001, false),
('cups', 'Cups', 'cups', 'volume', 'L', 0.236588, false),
('fl oz', 'Fluid Ounces', 'fl oz', 'volume', 'L', 0.0295735, false),
('gal', 'Gallons', 'gal', 'volume', 'L', 3.78541, false),
('pt', 'Pints', 'pt', 'volume', 'L', 0.473176, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Speed units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('m/s', 'Meters per Second', 'm/s', 'speed', NULL, NULL, true),
('mph', 'Miles per Hour', 'mph', 'speed', 'm/s', 0.44704, false),
('km/h', 'Kilometers per Hour', 'km/h', 'speed', 'm/s', 0.277778, false),
('knots', 'Knots', 'knots', 'speed', 'm/s', 0.514444, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Pressure units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('mmHg', 'Millimeters of Mercury', 'mmHg', 'pressure', NULL, NULL, true),
('kPa', 'Kilopascals', 'kPa', 'pressure', 'mmHg', 7.50062, false),
('psi', 'Pounds per Square Inch', 'psi', 'pressure', 'mmHg', 51.7149, false),
('bar', 'Bars', 'bar', 'pressure', 'mmHg', 750.062, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Frequency units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('per day', 'Per Day', '/day', 'frequency', NULL, NULL, true),
('per week', 'Per Week', '/week', 'frequency', 'per day', 0.142857, false),
('per month', 'Per Month', '/month', 'frequency', 'per day', 0.0328767, false),
('per year', 'Per Year', '/year', 'frequency', 'per day', 0.00273973, false),
('times', 'Times', 'times', 'frequency', 'per day', NULL, false),
('Hz', 'Hertz', 'Hz', 'frequency', 'per day', 86400, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Percentage units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('%', 'Percentage', '%', 'percentage', NULL, NULL, true)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Boolean units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('true/false', 'True/False', 'T/F', 'boolean', NULL, NULL, true),
('yes/no', 'Yes/No', 'Y/N', 'boolean', 'true/false', 1, false),
('0/1', 'Zero/One', '0/1', 'boolean', 'true/false', 1, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- Score units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
('1-10', 'Scale 1-10', '1-10', 'score', NULL, NULL, true),
('1-5', 'Scale 1-5', '1-5', 'score', '1-10', 2, false),
('0-100', 'Scale 0-100', '0-100', 'score', '1-10', 0.1, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base,
    updated_at = NOW();

-- ============================================================================
-- FUNCTIONS FOR UNIT CONVERSION
-- ============================================================================

-- Function to convert between units
CREATE OR REPLACE FUNCTION convert_unit(
    value NUMERIC,
    from_unit TEXT,
    to_unit TEXT
) RETURNS NUMERIC AS $$
DECLARE
    from_unit_record RECORD;
    to_unit_record RECORD;
    conversion_factor NUMERIC;
    result NUMERIC;
BEGIN
    -- Handle same unit case
    IF from_unit = to_unit THEN
        RETURN value;
    END IF;
    
    -- Get unit records
    SELECT * INTO from_unit_record FROM units WHERE id = from_unit;
    SELECT * INTO to_unit_record FROM units WHERE id = to_unit;
    
    -- If units not found, return original value
    IF from_unit_record IS NULL OR to_unit_record IS NULL THEN
        RETURN value;
    END IF;
    
    -- If different unit groups, return original value
    IF from_unit_record.unit_group != to_unit_record.unit_group THEN
        RETURN value;
    END IF;
    
    -- Handle temperature conversions (special case)
    IF from_unit_record.unit_group = 'temperature' THEN
        IF from_unit = '°C' AND to_unit = '°F' THEN
            RETURN (value * 9/5) + 32;
        ELSIF from_unit = '°F' AND to_unit = '°C' THEN
            RETURN (value - 32) * 5/9;
        ELSIF from_unit = '°C' AND to_unit = 'K' THEN
            RETURN value + 273.15;
        ELSIF from_unit = 'K' AND to_unit = '°C' THEN
            RETURN value - 273.15;
        ELSIF from_unit = '°F' AND to_unit = 'K' THEN
            RETURN (value - 32) * 5/9 + 273.15;
        ELSIF from_unit = 'K' AND to_unit = '°F' THEN
            RETURN (value - 273.15) * 9/5 + 32;
        END IF;
    END IF;
    
    -- Handle score conversions
    IF from_unit_record.unit_group = 'score' THEN
        IF from_unit_record.conversion_factor IS NOT NULL THEN
            RETURN value * from_unit_record.conversion_factor;
        END IF;
    END IF;
    
    -- Handle boolean conversions
    IF from_unit_record.unit_group = 'boolean' THEN
        -- All boolean units convert 1:1
        RETURN value;
    END IF;
    
    -- Standard conversion using conversion factors
    IF from_unit_record.conversion_to = to_unit THEN
        -- Direct conversion
        RETURN value * from_unit_record.conversion_factor;
    ELSIF to_unit_record.conversion_to = from_unit THEN
        -- Reverse conversion
        RETURN value / to_unit_record.conversion_factor;
    ELSIF from_unit_record.conversion_to = to_unit_record.conversion_to THEN
        -- Both convert to same base unit
        RETURN (value * from_unit_record.conversion_factor) / to_unit_record.conversion_factor;
    END IF;
    
    -- If no conversion found, return original value
    RETURN value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get all units for a unit group
CREATE OR REPLACE FUNCTION get_units_by_group(group_name TEXT)
RETURNS TABLE(
    id TEXT,
    label TEXT,
    symbol TEXT,
    unit_group TEXT,
    is_base BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.label, u.symbol, u.unit_group, u.is_base
    FROM units u
    WHERE u.unit_group = group_name
    ORDER BY u.is_base DESC, u.label;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get base unit for a unit group
CREATE OR REPLACE FUNCTION get_base_unit(group_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_unit TEXT;
BEGIN
    SELECT u.id INTO base_unit
    FROM units u
    WHERE u.unit_group = group_name AND u.is_base = true
    LIMIT 1;
    
    RETURN base_unit;
END;
$$ LANGUAGE plpgsql STABLE; 