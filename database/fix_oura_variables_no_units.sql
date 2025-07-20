-- ============================================================================
-- FIX OURA VARIABLES WITHOUT UNIT CONSTRAINTS
-- ============================================================================
-- This version avoids canonical_unit foreign key issues by using NULL

-- Step 1: Check what units are available (for reference)
SELECT 'Available units in your units table:' as info;
SELECT id, label, symbol, unit_group, is_base 
FROM units 
ORDER BY unit_group, is_base DESC, label;

-- Step 2: Create Oura variables WITHOUT canonical_unit to avoid foreign key errors
INSERT INTO variables (slug, label, description, data_type, source_type, category, is_active) VALUES
    -- Sleep variables
    ('sleep_score', 'Sleep Score', 'Sleep Score (0-100) measured by Oura Ring', 'continuous', 'oura', 'Sleep', true),
    ('total_sleep_duration', 'Total Sleep Duration', 'Total Sleep Duration in seconds measured by Oura Ring', 'continuous', 'oura', 'Sleep', true),
    ('rem_sleep_duration', 'REM Sleep Duration', 'REM Sleep Duration in seconds measured by Oura Ring', 'continuous', 'oura', 'Sleep', true),
    ('deep_sleep_duration', 'Deep Sleep Duration', 'Deep Sleep Duration in seconds measured by Oura Ring', 'continuous', 'oura', 'Sleep', true),
    ('light_sleep_duration', 'Light Sleep Duration', 'Light Sleep Duration in seconds measured by Oura Ring', 'continuous', 'oura', 'Sleep', true),
    ('sleep_latency', 'Sleep Latency', 'Sleep Latency in seconds measured by Oura Ring', 'continuous', 'oura', 'Sleep', true),
    ('efficiency', 'Sleep Efficiency', 'Sleep Efficiency percentage measured by Oura Ring', 'continuous', 'oura', 'Sleep', true),

    -- Recovery variables
    ('readiness_score', 'Readiness Score', 'Readiness Score (0-100) measured by Oura Ring', 'continuous', 'oura', 'Recovery', true),
    ('temperature_deviation', 'Temperature Deviation', 'Temperature Deviation in Celsius measured by Oura Ring', 'continuous', 'oura', 'Recovery', true),
    ('temperature_trend_deviation', 'Temperature Trend Deviation', 'Temperature Trend Deviation in Celsius measured by Oura Ring', 'continuous', 'oura', 'Recovery', true),

    -- Heart Rate variables
    ('hr_lowest', 'Lowest Heart Rate', 'Lowest Heart Rate in BPM measured by Oura Ring', 'continuous', 'oura', 'Heart Rate', true),
    ('hr_average', 'Average Heart Rate', 'Average Heart Rate in BPM measured by Oura Ring', 'continuous', 'oura', 'Heart Rate', true),

    -- Activity variables
    ('activity_score', 'Activity Score', 'Activity Score (0-100) measured by Oura Ring', 'continuous', 'oura', 'Activity', true),
    ('steps', 'Steps', 'Steps measured by Oura Ring', 'continuous', 'oura', 'Activity', true),
    ('calories_active', 'Active Calories', 'Active Calories in kcal measured by Oura Ring', 'continuous', 'oura', 'Activity', true),
    ('calories_total', 'Total Calories', 'Total Calories in kcal measured by Oura Ring', 'continuous', 'oura', 'Activity', true)

ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
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
SELECT 'Variables with linked data:' as info;

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

-- Step 6: Generate UPDATE statements to fix orphaned data
SELECT 'AUTOMATED MAPPING SUGGESTIONS:' as info;
SELECT 'Based on value patterns, here are suggested UPDATE statements:' as instruction;

-- Generate suggested mappings based on value analysis
WITH orphaned_analysis AS (
    SELECT 
        ovdp.variable_id as orphaned_id,
        COUNT(*) as data_points,
        AVG(ovdp.value) as avg_value,
        MIN(ovdp.value) as min_value,
        MAX(ovdp.value) as max_value
    FROM oura_variable_data_points ovdp
    LEFT JOIN variables v ON ovdp.variable_id = v.id
    WHERE v.id IS NULL
    GROUP BY ovdp.variable_id
),
suggested_mappings AS (
    SELECT 
        orphaned_id,
        data_points,
        avg_value,
        CASE 
            WHEN avg_value BETWEEN 0 AND 100 AND max_value <= 100 AND avg_value > 10 THEN 'sleep_score'
            WHEN avg_value BETWEEN 0 AND 100 AND max_value <= 100 AND avg_value <= 10 THEN 'readiness_score'
            WHEN avg_value > 20000 AND avg_value < 50000 THEN 'total_sleep_duration'
            WHEN avg_value > 1000 AND avg_value < 20000 THEN 'rem_sleep_duration'
            WHEN avg_value > 5000 AND avg_value < 25000 AND avg_value != (SELECT avg_value FROM orphaned_analysis WHERE avg_value > 20000 LIMIT 1) THEN 'deep_sleep_duration'
            WHEN avg_value BETWEEN 40 AND 100 THEN 'hr_average'
            WHEN avg_value BETWEEN 30 AND 60 THEN 'hr_lowest'
            WHEN avg_value > 1000 AND avg_value < 5000 THEN 'steps'
            WHEN avg_value BETWEEN -5 AND 5 THEN 'temperature_deviation'
            WHEN avg_value BETWEEN 200 AND 1000 THEN 'calories_active'
            ELSE 'MANUAL_REVIEW_NEEDED'
        END as suggested_variable
    FROM orphaned_analysis
)
SELECT 
    CONCAT(
        'UPDATE oura_variable_data_points SET variable_id = (SELECT id FROM variables WHERE slug = ''',
        suggested_variable,
        ''') WHERE variable_id = ''',
        orphaned_id,
        '''; -- ',
        data_points,
        ' data points, avg: ',
        ROUND(avg_value::numeric, 2)
    ) as update_statement
FROM suggested_mappings 
WHERE suggested_variable != 'MANUAL_REVIEW_NEEDED'
ORDER BY data_points DESC;

-- Step 7: Solution recommendations
SELECT 'SOLUTION RECOMMENDATIONS:' as info;
SELECT '1. ✅ Variables created without unit constraints' as step;
SELECT '2. 📊 Review the orphaned data analysis above' as step;
SELECT '3. 🔧 Copy and run the UPDATE statements to map orphaned data' as step;
SELECT '4. 🔄 Or re-sync Oura data using latest Edge Function' as step;
SELECT '5. ✅ Oura variables should then appear in privacy settings' as step;

SELECT '✅ Oura variables created successfully!' as result; 