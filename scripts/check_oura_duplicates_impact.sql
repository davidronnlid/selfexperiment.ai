-- Check Impact of Deleting Duplicate Oura Variables
-- This script shows what data would be lost if we delete Oura-labeled duplicates

-- ============================================================================
-- STEP 1: IDENTIFY DUPLICATES AND THEIR IMPACT
-- ============================================================================

WITH oura_vars AS (
    SELECT 
        id,
        slug,
        label,
        source_type,
        category,
        CASE 
            WHEN label ILIKE 'Oura %' THEN trim(substring(label from 6))
            WHEN label ILIKE 'oura %' THEN trim(substring(label from 6))
            WHEN label ILIKE 'Oura%' THEN trim(substring(label from 5))
            WHEN label ILIKE 'oura%' THEN trim(substring(label from 5))
            ELSE label
        END as new_label
    FROM variables 
    WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%'
),
duplicates AS (
    SELECT 
        o.id as oura_var_id,
        o.slug as oura_slug,
        o.label as oura_label,
        o.new_label as would_become,
        e.id as existing_var_id,
        e.slug as existing_slug,
        e.label as existing_label,
        e.source_type as existing_source_type
    FROM oura_vars o
    JOIN variables e ON e.label = o.new_label
    WHERE e.id != o.id
)
SELECT 
    'DUPLICATE ANALYSIS' as analysis_type,
    d.oura_var_id,
    d.oura_slug,
    d.oura_label,
    d.would_become,
    d.existing_var_id,
    d.existing_slug,
    d.existing_label,
    d.existing_source_type
FROM duplicates d
ORDER BY d.would_become;

-- ============================================================================
-- STEP 2: COUNT DATA POINTS THAT WOULD BE AFFECTED
-- ============================================================================

-- Count data_points for Oura variables that would be deleted
WITH oura_vars AS (
    SELECT 
        id,
        slug,
        label,
        CASE 
            WHEN label ILIKE 'Oura %' THEN trim(substring(label from 6))
            WHEN label ILIKE 'oura %' THEN trim(substring(label from 6))
            WHEN label ILIKE 'Oura%' THEN trim(substring(label from 5))
            WHEN label ILIKE 'oura%' THEN trim(substring(label from 5))
            ELSE label
        END as new_label
    FROM variables 
    WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%'
),
duplicates AS (
    SELECT o.id as oura_var_id
    FROM oura_vars o
    JOIN variables e ON e.label = o.new_label
    WHERE e.id != o.id
)
SELECT 
    'DATA IMPACT' as impact_type,
    COUNT(dp.id) as data_point_count,
    'data_points that would be orphaned' as description
FROM duplicates d
LEFT JOIN data_points dp ON dp.variable_id = d.oura_var_id;

-- ============================================================================
-- STEP 3: SHOW SPECIFIC DATA POINTS THAT WOULD BE LOST
-- ============================================================================

-- Show sample of variable_logs that would be affected
WITH oura_vars AS (
    SELECT 
        id,
        slug,
        label,
        CASE 
            WHEN label ILIKE 'Oura %' THEN trim(substring(label from 6))
            WHEN label ILIKE 'oura %' THEN trim(substring(label from 6))
            WHEN label ILIKE 'Oura%' THEN trim(substring(label from 5))
            WHEN label ILIKE 'oura%' THEN trim(substring(label from 5))
            ELSE label
        END as new_label
    FROM variables 
    WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%'
),
duplicates AS (
    SELECT o.id as oura_var_id, o.label as oura_label
    FROM oura_vars o
    JOIN variables e ON e.label = o.new_label
    WHERE e.id != o.id
)
SELECT 
    'SAMPLE DATA LOSS' as data_type,
    d.oura_label,
    vl.id as log_id,
    vl.user_id,
    vl.display_value,
    vl.logged_at,
    vl.source
FROM duplicates d
LEFT JOIN variable_logs vl ON vl.variable_id = d.oura_var_id
ORDER BY d.oura_label, vl.logged_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 4: RECOMMENDATION
-- ============================================================================

SELECT 
    'RECOMMENDATION' as rec_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM (
                WITH oura_vars AS (
                    SELECT 
                        id,
                        label,
                        CASE 
                            WHEN label ILIKE 'Oura %' THEN trim(substring(label from 6))
                            WHEN label ILIKE 'oura %' THEN trim(substring(label from 6))
                            WHEN label ILIKE 'Oura%' THEN trim(substring(label from 5))
                            WHEN label ILIKE 'oura%' THEN trim(substring(label from 5))
                            ELSE label
                        END as new_label
                    FROM variables 
                    WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%'
                )
                SELECT o.id
                FROM oura_vars o
                JOIN variables e ON e.label = o.new_label
                WHERE e.id != o.id
            ) dupes
        ) THEN 'WARNING: Duplicates found. Consider migrating data before deletion.'
        ELSE 'No duplicates found. Safe to proceed with label updates.'
    END as recommendation; 