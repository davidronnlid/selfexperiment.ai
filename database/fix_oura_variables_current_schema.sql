-- ============================================================================
-- FIX OURA VARIABLES FOR CURRENT SCHEMA
-- ============================================================================
-- This version works with your actual variables table structure

-- Step 1: Check current variables table structure
SELECT 'Current variables table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'variables' 
ORDER BY ordinal_position;

-- Step 2: Check current Oura variables
SELECT 'Current Oura variables in variables table:' as info;
SELECT slug, label, id, source_type FROM variables WHERE source_type = 'oura' ORDER BY slug;

-- Step 3: Create Oura variables using only columns that exist
-- This uses minimal columns that should exist in any variables table
INSERT INTO variables (slug, label, description, data_type, canonical_unit, source_type, category, is_active) VALUES
    ('sleep_score', 'Sleep Score', 'Sleep Score measured by Oura Ring', 'continuous', 'score', 'oura', 'Sleep', true),
    ('total_sleep_duration', 'Total Sleep Duration', 'Total Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'oura', 'Sleep', true),
    ('rem_sleep_duration', 'REM Sleep Duration', 'REM Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'oura', 'Sleep', true),
    ('deep_sleep_duration', 'Deep Sleep Duration', 'Deep Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'oura', 'Sleep', true),
    ('light_sleep_duration', 'Light Sleep Duration', 'Light Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'oura', 'Sleep', true),
    ('efficiency', 'Sleep Efficiency', 'Sleep Efficiency measured by Oura Ring', 'continuous', '%', 'oura', 'Sleep', true),
    ('sleep_latency', 'Sleep Latency', 'Sleep Latency measured by Oura Ring', 'continuous', 'seconds', 'oura', 'Sleep', true),
    ('readiness_score', 'Readiness Score', 'Readiness Score measured by Oura Ring', 'continuous', 'score', 'oura', 'Recovery', true),
    ('temperature_deviation', 'Temperature Deviation', 'Temperature Deviation measured by Oura Ring', 'continuous', '°C', 'oura', 'Recovery', true),
    ('temperature_trend_deviation', 'Temperature Trend Deviation', 'Temperature Trend Deviation measured by Oura Ring', 'continuous', '°C', 'oura', 'Recovery', true),
    ('hr_lowest', 'Lowest Heart Rate', 'Lowest Heart Rate measured by Oura Ring', 'continuous', 'bpm', 'oura', 'Heart Rate', true),
    ('hr_average', 'Average Heart Rate', 'Average Heart Rate measured by Oura Ring', 'continuous', 'bpm', 'oura', 'Heart Rate', true),
    ('activity_score', 'Activity Score', 'Activity Score measured by Oura Ring', 'continuous', 'score', 'oura', 'Activity', true),
    ('steps', 'Steps', 'Steps measured by Oura Ring', 'continuous', 'steps', 'oura', 'Activity', true),
    ('calories_active', 'Active Calories', 'Active Calories measured by Oura Ring', 'continuous', 'kcal', 'oura', 'Activity', true),
    ('calories_total', 'Total Calories', 'Total Calories measured by Oura Ring', 'continuous', 'kcal', 'oura', 'Activity', true)
ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    canonical_unit = EXCLUDED.canonical_unit,
    source_type = EXCLUDED.source_type,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 4: Check what variables we have now
SELECT 'Updated Oura variables:' as info;
SELECT slug, label, id, source_type FROM variables WHERE source_type = 'oura' ORDER BY slug;

-- Step 5: Analyze the variable_id links in oura_variable_data_points
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

-- Step 6: Show orphaned variable IDs for analysis
SELECT 'Orphaned variable IDs (for manual mapping):' as info;
SELECT 
    ovdp.variable_id as orphaned_id,
    COUNT(*) as data_points,
    MIN(ovdp.value) as min_value,
    MAX(ovdp.value) as max_value,
    AVG(ovdp.value) as avg_value,
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

-- Step 7: Solution recommendations
SELECT 'SOLUTION RECOMMENDATIONS:' as info;
SELECT '1. The variables have been created/updated in the variables table' as step;
SELECT '2. Run this query to see which data points are orphaned' as step;
SELECT '3. Option A: Re-sync Oura data using latest Edge Function (recommended)' as step;
SELECT '4. Option B: Manually map orphaned UUIDs to correct variables' as step;
SELECT '5. Option C: Clear orphaned data and fresh sync' as step;

SELECT '✅ Oura variables analysis completed!' as result; 