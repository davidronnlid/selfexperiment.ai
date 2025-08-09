-- ============================================================================
-- ADD CONCENTRATION UNITS AND FIX CONCENTRATION_GLUCOSE CATEGORY
-- ============================================================================
-- This script adds concentration units and changes any concentration_glucose
-- unit groups to just "concentration"

-- First, update any existing concentration_glucose units to concentration
UPDATE units 
SET unit_group = 'concentration'
WHERE unit_group = 'concentration_glucose';

-- Add comprehensive concentration units
INSERT INTO units (id, label, symbol, unit_group, conversion_to, conversion_factor, is_base) VALUES
-- Glucose concentration units (medical standard)
('mg_dl', 'Milligrams per Deciliter', 'mg/dL', 'concentration', NULL, NULL, true),
('mmol_l', 'Millimoles per Liter', 'mmol/L', 'concentration', 'mg_dl', 18.01559, false),

-- General concentration units
('mg_ml', 'Milligrams per Milliliter', 'mg/mL', 'concentration', 'mg_dl', 100, false),
('g_l', 'Grams per Liter', 'g/L', 'concentration', 'mg_dl', 100, false),
('mg_l', 'Milligrams per Liter', 'mg/L', 'concentration', 'mg_dl', 0.1, false),
('mcg_ml', 'Micrograms per Milliliter', 'μg/mL', 'concentration', 'mg_dl', 0.1, false),

-- Percentage concentrations
('pct_wv', 'Percent Weight/Volume', '% w/v', 'concentration', 'mg_dl', 1000, false),
('pct_vv', 'Percent Volume/Volume', '% v/v', 'concentration', 'mg_dl', 1000, false),
('pct_ww', 'Percent Weight/Weight', '% w/w', 'concentration', 'mg_dl', 1000, false),

-- Parts per million/billion
('ppm', 'Parts Per Million', 'ppm', 'concentration', 'mg_dl', 0.1, false),
('ppb', 'Parts Per Billion', 'ppb', 'concentration', 'mg_dl', 0.0001, false)

ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    symbol = EXCLUDED.symbol,
    unit_group = EXCLUDED.unit_group,
    conversion_to = EXCLUDED.conversion_to,
    conversion_factor = EXCLUDED.conversion_factor,
    is_base = EXCLUDED.is_base;

-- Show results
SELECT 'Concentration units updated/added successfully' as result;
SELECT 
    id, 
    label, 
    symbol, 
    unit_group, 
    conversion_factor, 
    is_base 
FROM units 
WHERE unit_group = 'concentration'
ORDER BY is_base DESC, conversion_factor DESC NULLS FIRST;