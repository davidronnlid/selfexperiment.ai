-- ============================================================================
-- FIX OURA VARIABLE LINKS
-- ============================================================================
-- This script fixes the issue where oura_variable_data_points has variable_id UUIDs
-- that don't correspond to actual records in the variables table

-- Step 1: Check current state
SELECT 'BEFORE: Variables in variables table with source_type = oura' as status;
SELECT slug, label, id FROM variables WHERE source_type = 'oura' ORDER BY slug;

SELECT 'BEFORE: Unique variable_ids in oura_variable_data_points' as status;
SELECT 
    variable_id, 
    COUNT(*) as data_point_count,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM oura_variable_data_points 
GROUP BY variable_id 
ORDER BY data_point_count DESC;

-- Step 2: Create the correct Oura variables if they don't exist
-- Using the latest clean naming convention (without oura_ prefix)
INSERT INTO variables (slug, label, description, data_type, canonical_unit, unit_group, convertible_units, default_display_unit, source_type, category, is_active) VALUES
    ('sleep_score', 'Sleep Score', 'Sleep Score measured by Oura Ring', 'continuous', 'score', 'score', '["score"]', 'score', 'oura', 'Sleep', true),
    ('total_sleep_duration', 'Total Sleep Duration', 'Total Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('rem_sleep_duration', 'REM Sleep Duration', 'REM Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('deep_sleep_duration', 'Deep Sleep Duration', 'Deep Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('light_sleep_duration', 'Light Sleep Duration', 'Light Sleep Duration measured by Oura Ring', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('efficiency', 'Sleep Efficiency', 'Sleep Efficiency measured by Oura Ring', 'continuous', '%', 'percentage', '["%"]', '%', 'oura', 'Sleep', true),
    ('sleep_latency', 'Sleep Latency', 'Sleep Latency measured by Oura Ring', 'continuous', 'seconds', 'time', '["seconds", "minutes"]', 'minutes', 'oura', 'Sleep', true),
    ('readiness_score', 'Readiness Score', 'Readiness Score measured by Oura Ring', 'continuous', 'score', 'score', '["score"]', 'score', 'oura', 'Recovery', true),
    ('temperature_deviation', 'Temperature Deviation', 'Temperature Deviation measured by Oura Ring', 'continuous', '°C', 'temperature', '["°C", "°F"]', '°C', 'oura', 'Recovery', true),
    ('temperature_trend_deviation', 'Temperature Trend Deviation', 'Temperature Trend Deviation measured by Oura Ring', 'continuous', '°C', 'temperature', '["°C", "°F"]', '°C', 'oura', 'Recovery', true),
    ('hr_lowest', 'Lowest Heart Rate', 'Lowest Heart Rate measured by Oura Ring', 'continuous', 'bpm', 'heart_rate', '["bpm"]', 'bpm', 'oura', 'Heart Rate', true),
    ('hr_average', 'Average Heart Rate', 'Average Heart Rate measured by Oura Ring', 'continuous', 'bpm', 'heart_rate', '["bpm"]', 'bpm', 'oura', 'Heart Rate', true),
    ('activity_score', 'Activity Score', 'Activity Score measured by Oura Ring', 'continuous', 'score', 'score', '["score"]', 'score', 'oura', 'Activity', true),
    ('steps', 'Steps', 'Steps measured by Oura Ring', 'continuous', 'steps', 'count', '["steps"]', 'steps', 'oura', 'Activity', true),
    ('calories_active', 'Active Calories', 'Active Calories measured by Oura Ring', 'continuous', 'kcal', 'energy', '["kcal", "kJ"]', 'kcal', 'oura', 'Activity', true),
    ('calories_total', 'Total Calories', 'Total Calories measured by Oura Ring', 'continuous', 'kcal', 'energy', '["kcal", "kJ"]', 'kcal', 'oura', 'Activity', true)
ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    data_type = EXCLUDED.data_type,
    canonical_unit = EXCLUDED.canonical_unit,
    unit_group = EXCLUDED.unit_group,
    convertible_units = EXCLUDED.convertible_units,
    default_display_unit = EXCLUDED.default_display_unit,
    source_type = EXCLUDED.source_type,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 3: Get the correct variable IDs
CREATE TEMP TABLE oura_variable_mapping AS
SELECT 
    slug,
    id as correct_variable_id
FROM variables 
WHERE source_type = 'oura' AND is_active = true;

-- Step 4: Check what we have now
SELECT 'AFTER: Variables created/updated' as status;
SELECT slug, label, id FROM variables WHERE source_type = 'oura' ORDER BY slug;

-- Step 5: Try to fix data points with reasonable guessing based on most common patterns
-- This is a best-effort attempt to salvage existing data

-- Find orphaned variable_ids (those not in variables table)
CREATE TEMP TABLE orphaned_variable_ids AS
SELECT DISTINCT 
    ovdp.variable_id as orphaned_id,
    COUNT(*) as data_points,
    MIN(ovdp.date) as earliest_date,
    MAX(ovdp.date) as latest_date,
    -- Try to guess what variable this might be based on data patterns
    CASE 
        WHEN COUNT(*) > 1000 THEN 'possibly_steps_or_calories'
        WHEN AVG(ovdp.value) BETWEEN 0 AND 100 THEN 'possibly_score'
        WHEN AVG(ovdp.value) > 1000 THEN 'possibly_duration_in_seconds'
        WHEN AVG(ovdp.value) BETWEEN 40 AND 120 THEN 'possibly_heart_rate'
        ELSE 'unknown_pattern'
    END as guess
FROM oura_variable_data_points ovdp
LEFT JOIN variables v ON ovdp.variable_id = v.id
WHERE v.id IS NULL
GROUP BY ovdp.variable_id
ORDER BY data_points DESC;

SELECT 'Orphaned variable IDs analysis:' as status;
SELECT * FROM orphaned_variable_ids;

-- Step 6: Option 1 - Clean approach: Remove orphaned data points
-- Uncomment this if you want to remove data points with invalid variable_ids
/*
DELETE FROM oura_variable_data_points 
WHERE variable_id NOT IN (SELECT id FROM variables);

SELECT 'Cleaned up orphaned data points' as status;
*/

-- Step 7: Option 2 - Try to map some obvious ones (CAREFUL - this is guessing!)
-- Only uncomment if you're confident about the mapping
/*
-- Example: Map the most common orphaned ID to steps (if it looks like steps data)
UPDATE oura_variable_data_points 
SET variable_id = (SELECT id FROM variables WHERE slug = 'steps' AND source_type = 'oura')
WHERE variable_id = (
    SELECT orphaned_id 
    FROM orphaned_variable_ids 
    WHERE guess = 'possibly_steps_or_calories' 
    AND data_points = (SELECT MAX(data_points) FROM orphaned_variable_ids)
    LIMIT 1
);
*/

-- Step 8: Show final state
SELECT 'FINAL: Data points by variable after cleanup' as status;
SELECT 
    v.slug,
    v.label,
    COUNT(ovdp.id) as data_points,
    MIN(ovdp.date) as earliest_date,
    MAX(ovdp.date) as latest_date
FROM oura_variable_data_points ovdp
JOIN variables v ON ovdp.variable_id = v.id
WHERE v.source_type = 'oura'
GROUP BY v.slug, v.label
ORDER BY data_points DESC;

-- Show remaining orphaned data (if any)
SELECT 'FINAL: Remaining orphaned data points' as status;
SELECT 
    ovdp.variable_id,
    COUNT(*) as orphaned_count
FROM oura_variable_data_points ovdp
LEFT JOIN variables v ON ovdp.variable_id = v.id
WHERE v.id IS NULL
GROUP BY ovdp.variable_id;

-- Drop temp tables
DROP TABLE IF EXISTS oura_variable_mapping;
DROP TABLE IF EXISTS orphaned_variable_ids;

SELECT '✅ Oura variable links analysis completed!' as result; 