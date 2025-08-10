-- ============================================================================
-- ADD VOLUME UNITS TO UNITS TABLE
-- ============================================================================
-- This migration adds comprehensive volume units to support measurements
-- like fluid intake, cooking volumes, etc.

-- Insert volume units with proper conversion factors to liters (base unit)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units' AND table_schema = 'public') THEN
    INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
-- Volume units (metric)
('l', 'Liters', 'L', 'volume', NULL, NULL, true),
('ml', 'Milliliters', 'mL', 'volume', 'l', 0.001, false),
('dl', 'Deciliters', 'dL', 'volume', 'l', 0.1, false),
('cl', 'Centiliters', 'cL', 'volume', 'l', 0.01, false),

-- Volume units (imperial/US)
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
        is_base = EXCLUDED.is_base;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify volume units were added correctly (only if units table exists)
DO $$
DECLARE
    volume_count INTEGER;
    rec RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO volume_count 
        FROM units 
        WHERE unit_group = 'volume';
        
        RAISE NOTICE 'Added % volume units to the database', volume_count;
        
        -- Show all volume units for verification
        RAISE NOTICE '--- Volume Units Added ---';
        FOR rec IN (
            SELECT id, label, symbol, conversion_factor, is_base 
            FROM units 
            WHERE unit_group = 'volume' 
            ORDER BY is_base DESC, conversion_factor DESC NULLS FIRST
        ) LOOP
            RAISE NOTICE 'Unit: % (%) - % - Factor: %', 
                rec.label, rec.symbol, rec.id, 
                CASE WHEN rec.is_base THEN 'BASE UNIT' ELSE COALESCE(rec.conversion_factor::TEXT, 'N/A') END;
        END LOOP;
    ELSE
        RAISE NOTICE 'Units table does not exist, skipping verification';
    END IF;
END $$;