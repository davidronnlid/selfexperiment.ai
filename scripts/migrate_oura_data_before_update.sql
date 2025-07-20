-- Migrate Oura Data Before Updating Variables
-- This script migrates data from Oura-labeled variables to existing variables
-- before deleting the duplicate Oura variables

-- ============================================================================
-- STEP 1: IDENTIFY DUPLICATES AND MIGRATION TARGETS
-- ============================================================================

-- Show which Oura variables would conflict and their migration targets
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
)
SELECT 
    'MIGRATION PLAN' as plan_type,
    o.id as oura_var_id,
    o.slug as oura_slug,
    o.label as oura_label,
    o.new_label as target_label,
    e.id as target_var_id,
    e.slug as target_slug,
    e.label as target_label_actual,
    e.source_type as target_source_type
FROM oura_vars o
JOIN variables e ON e.label = o.new_label
WHERE e.id != o.id
ORDER BY o.new_label;

-- ============================================================================
-- STEP 2: MIGRATE VARIABLE_LOGS DATA
-- ============================================================================

-- Migrate data_points from Oura variables to existing variables
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
),
migration_targets AS (
    SELECT 
        o.id as oura_var_id,
        e.id as target_var_id,
        o.label as oura_label,
        e.label as target_label
    FROM oura_vars o
    JOIN variables e ON e.label = o.new_label
    WHERE e.id != o.id
)
UPDATE data_points 
SET 
    variable_id = mt.target_var_id
FROM migration_targets mt
WHERE data_points.variable_id = mt.oura_var_id;

-- ============================================================================
-- STEP 3: MIGRATE OTHER RELATED DATA (if any)
-- ============================================================================

-- If you have other tables that reference variables, migrate them here
-- For example, user_variable_preferences, routine_time_variables, etc.

-- Migrate user_variable_preferences (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_variable_preferences') THEN
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
        ),
        migration_targets AS (
            SELECT 
                o.id as oura_var_id,
                e.id as target_var_id
            FROM oura_vars o
            JOIN variables e ON e.label = o.new_label
            WHERE e.id != o.id
        )
        UPDATE user_variable_preferences 
        SET 
            variable_id = mt.target_var_id
        FROM migration_targets mt
        WHERE user_variable_preferences.variable_id = mt.oura_var_id;
    END IF;
END $$;

-- Migrate routine_time_variables (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routine_time_variables') THEN
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
        ),
        migration_targets AS (
            SELECT 
                o.id as oura_var_id,
                e.id as target_var_id
            FROM oura_vars o
            JOIN variables e ON e.label = o.new_label
            WHERE e.id != o.id
        )
        UPDATE routine_time_variables 
        SET 
            variable_id = mt.target_var_id
        FROM migration_targets mt
        WHERE routine_time_variables.variable_id = mt.oura_var_id;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: VERIFY MIGRATION
-- ============================================================================

-- Show migration results
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
),
migration_targets AS (
    SELECT 
        o.id as oura_var_id,
        e.id as target_var_id,
        o.label as oura_label,
        e.label as target_label
    FROM oura_vars o
    JOIN variables e ON e.label = o.new_label
    WHERE e.id != o.id
)
SELECT 
    'MIGRATION VERIFICATION' as verification_type,
    mt.oura_label,
    mt.target_label,
    COUNT(dp_oura.id) as oura_data_points_before,
    COUNT(dp_target.id) as target_data_points_after
FROM migration_targets mt
LEFT JOIN data_points dp_oura ON dp_oura.variable_id = mt.oura_var_id
LEFT JOIN data_points dp_target ON dp_target.variable_id = mt.target_var_id
GROUP BY mt.oura_var_id, mt.target_var_id, mt.oura_label, mt.target_label
ORDER BY mt.oura_label;

-- ============================================================================
-- STEP 5: SUMMARY
-- ============================================================================

SELECT 
    'MIGRATION COMPLETE' as status,
    'Data has been migrated from Oura variables to existing variables' as message,
    'You can now safely run the variable update script' as next_step,
    NOW() as completed_at; 