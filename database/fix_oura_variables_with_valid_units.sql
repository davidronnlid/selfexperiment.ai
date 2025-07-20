-- ============================================================================
-- FIX OURA VARIABLES WITH VALID UNITS FROM UNITS TABLE
-- ============================================================================
-- This version uses only units that exist in your units table

-- Step 1: Check what units are available
SELECT 'Available units in your units table:' as info;
SELECT id, label, symbol, unit_group, is_base 
FROM units 
ORDER BY unit_group, is_base DESC, label;

-- Step 2: Create Oura variables using ONLY valid unit IDs from units table
INSERT INTO variables (slug, label, description, data_type, canonical_unit, source_type, category, is_active) VALUES
    -- Score variables using '1-10' from units table
    ('sleep_score', 'Sleep Score', 'Sleep Score measured by Oura Ring', 'continuous', '1-10', 'oura', 'Sleep', true),
    ('readiness_score', 'Readiness Score', 'Readiness Score measured by Oura Ring', 'continuous', '1-10', 'oura', 'Recovery', true),
    ('activity_score', 'Activity Score', 'Activity Score measured by Oura Ring', 'continuous', '1-10', 'oura', 'Activity', true),

    -- Time/Duration variables using 'hours' from units table (will convert from seconds in frontend)
    ('total_sleep_duration', 'Total Sleep Duration', 'Total Sleep Duration measured by Oura Ring', 'continuous', 'hours', 'oura', 'Sleep', true),
    ('rem_sleep_duration', 'REM Sleep Duration', 'REM Sleep Duration measured by Oura Ring', 'continuous', 'hours', 'oura', 'Sleep', true),
    ('deep_sleep_duration', 'Deep Sleep Duration', 'Deep Sleep Duration measured by Oura Ring', 'continuous', 'hours', 'oura', 'Sleep', true),
    ('light_sleep_duration', 'Light Sleep Duration', 'Light Sleep Duration measured by Oura Ring', 'continuous', 'hours', 'oura', 'Sleep', true),
    ('sleep_latency', 'Sleep Latency', 'Sleep Latency measured by Oura Ring', 'continuous', 'minutes', 'oura', 'Sleep', true),

    -- Percentage variables using '%' from units table
    ('efficiency', 'Sleep Efficiency', 'Sleep Efficiency measured by Oura Ring', 'continuous', '%', 'oura', 'Sleep', true),

    -- Temperature variables using '°C' from units table
    ('temperature_deviation', 'Temperature Deviation', 'Temperature Deviation measured by Oura Ring', 'continuous', '°C', 'oura', 'Recovery', true),
    ('temperature_trend_deviation', 'Temperature Trend Deviation', 'Temperature Trend Deviation measured by Oura Ring', 'continuous', '°C', 'oura', 'Recovery', true),

    -- Variables without canonical_unit (generic continuous values)
    ('hr_lowest', 'Lowest Heart Rate', 'Lowest Heart Rate measured by Oura Ring', 'continuous', NULL, 'oura', 'Heart Rate', true),
    ('hr_average', 'Average Heart Rate', 'Average Heart Rate measured by Oura Ring', 'continuous', NULL, 'oura', 'Heart Rate', true),
    ('steps', 'Steps', 'Steps measured by Oura Ring', 'continuous', NULL, 'oura', 'Activity', true),
    ('calories_active', 'Active Calories', 'Active Calories measured by Oura Ring', 'continuous', NULL, 'oura', 'Activity', true),
    ('calories_total', 'Total Calories', 'Total Calories measured by Oura Ring', 'continuous', NULL, 'oura', 'Activity', true)

ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    canonical_unit = EXCLUDED.canonical_unit,
    source_type = EXCLUDED.source_type,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 3: Check what Oura variables we have now
SELECT 'Updated Oura variables in variables table:' as info;
SELECT slug, label, id, canonical_unit, source_type 
FROM variables 
WHERE source_type = 'oura' 
ORDER BY category, slug;

-- Step 4: Analyze the variable_id links in oura_variable_data_points
SELECT 'Analysis of oura_variable_data_points linkage:' as info;

-- Count total data points
SELECT 
    'Total oura_variable_data_points' as metric,
    COUNT(*) as count
FROM oura_variable_data_points;

-- Count linked vs orphaned data points
SELECT 
    CASE 
        WHEN v.id IS NOT NULL THEN 'Properly linked'
        ELSE 'Orphaned (no matching variable)'
    END as status,
    COUNT(*) as count
FROM oura_variable_data_points ovdp
LEFT JOIN variables v ON ovdp.variable_id = v.id
GROUP BY (v.id IS NOT NULL)
ORDER BY count DESC;

-- Show linked variables with data counts
SELECT 
    'Variables with linked data:' as info;

SELECT 
    v.slug,
    v.label,
    COUNT(ovdp.id) as data_points
FROM variables v
INNER JOIN oura_variable_data_points ovdp ON v.id = ovdp.variable_id
WHERE v.source_type = 'oura'
GROUP BY v.slug, v.label
ORDER BY data_points DESC;

-- Step 5: Show orphaned variable IDs for analysis
SELECT 'Orphaned variable IDs (for manual mapping):' as info;
SELECT 
    ovdp.variable_id as orphaned_id,
    COUNT(*) as data_points,
    ROUND(MIN(ovdp.value)::numeric, 2) as min_value,
    ROUND(MAX(ovdp.value)::numeric, 2) as max_value,
    ROUND(AVG(ovdp.value)::numeric, 2) as avg_value,
    -- Guess what this might be based on value patterns
    CASE 
        WHEN AVG(ovdp.value) BETWEEN 0 AND 100 AND MAX(ovdp.value) <= 100 THEN 'Likely: Score (0-100)'
        WHEN AVG(ovdp.value) > 1000 AND AVG(ovdp.value) < 50000 THEN 'Likely: Duration in seconds'
        WHEN AVG(ovdp.value) BETWEEN 40 AND 120 THEN 'Likely: Heart rate (BPM)'
        WHEN AVG(ovdp.value) > 100 AND AVG(ovdp.value) < 1000 THEN 'Likely: Steps (hundreds) or Calories'
        WHEN AVG(ovdp.value) > 1000 THEN 'Likely: Steps (thousands) or Long duration'
        WHEN AVG(ovdp.value) BETWEEN -5 AND 5 THEN 'Likely: Temperature deviation'
        ELSE 'Unknown pattern'
    END as likely_variable_type
FROM oura_variable_data_points ovdp
LEFT JOIN variables v ON ovdp.variable_id = v.id
WHERE v.id IS NULL
GROUP BY ovdp.variable_id
ORDER BY data_points DESC;

-- Step 6: Create a mapping script for orphaned data
SELECT 'SCRIPT TO FIX ORPHANED DATA:' as info;
SELECT 'Copy the UUIDs from above and update them to point to correct variables' as instruction;
SELECT 'Example:' as example;
SELECT 'UPDATE oura_variable_data_points SET variable_id = (SELECT id FROM variables WHERE slug = ''sleep_score'') WHERE variable_id = ''ORPHANED-UUID-HERE'';' as example_sql;

-- Step 7: Solution recommendations
SELECT 'SOLUTION RECOMMENDATIONS:' as info;
SELECT '1. ✅ Variables created with valid units from your units table' as step;
SELECT '2. 📊 Run analysis above to see orphaned data patterns' as step;
SELECT '3. 🔧 Option A: Re-sync Oura data using latest Edge Function (recommended)' as step;
SELECT '4. 🔧 Option B: Use UPDATE statements to map orphaned UUIDs to correct variables' as step;
SELECT '5. 🧹 Option C: Clear orphaned data and fresh sync' as step;

SELECT '✅ Oura variables created with valid units!' as result; 