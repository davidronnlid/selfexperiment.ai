-- Update Oura Variables Script with Duplicate Handling
-- This script removes "Oura" or "oura" prefix from variable labels
-- and handles duplicates by deleting Oura-labeled variables when non-Oura versions exist

-- ============================================================================
-- STEP 1: SHOW WHAT WILL BE CHANGED (DRY RUN)
-- ============================================================================

-- Show current state of variables that will be updated
SELECT 
    'BEFORE UPDATE' as status,
    id,
    slug,
    label,
    source_type,
    category
FROM variables 
WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%'
ORDER BY label;

-- ============================================================================
-- STEP 2: IDENTIFY DUPLICATES
-- ============================================================================

-- Show which Oura variables would conflict with existing labels
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
    'DUPLICATE DETECTED' as status,
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
ORDER BY o.new_label;

-- ============================================================================
-- STEP 3: DELETE DUPLICATE OURA VARIABLES
-- ============================================================================

-- Delete Oura variables that would conflict with existing labels
DELETE FROM variables 
WHERE id IN (
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
);

-- ============================================================================
-- STEP 4: UPDATE REMAINING VARIABLE LABELS
-- ============================================================================

-- Update labels: remove "Oura" or "oura" prefix from remaining variables
UPDATE variables 
SET 
    label = CASE 
        WHEN label ILIKE 'Oura %' THEN trim(substring(label from 6))
        WHEN label ILIKE 'oura %' THEN trim(substring(label from 6))
        WHEN label ILIKE 'Oura%' THEN trim(substring(label from 5))
        WHEN label ILIKE 'oura%' THEN trim(substring(label from 5))
        ELSE label
    END,
    updated_at = NOW()
WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%';

-- ============================================================================
-- STEP 5: UPDATE VARIABLE SLUGS
-- ============================================================================

-- Update slugs: remove the first underscore after "oura" if it exists
UPDATE variables 
SET 
    slug = CASE 
        WHEN slug LIKE 'oura_%' THEN 
            -- Find the position of the second underscore (after "oura_")
            CASE 
                WHEN position('_' in substring(slug from 6)) > 0 THEN
                    -- There's a second underscore, remove the first one
                    'oura' || substring(slug from position('_' in substring(slug from 6)) + 6)
                ELSE
                    -- No second underscore, just remove the first one
                    'oura' || substring(slug from 6)
            END
        ELSE slug
    END,
    updated_at = NOW()
WHERE slug LIKE 'oura_%';

-- ============================================================================
-- STEP 6: SHOW RESULTS AFTER UPDATE
-- ============================================================================

-- Show updated variables
SELECT 
    'AFTER UPDATE' as status,
    id,
    slug,
    label,
    source_type,
    category
FROM variables 
WHERE source_type = 'oura' OR slug LIKE 'oura%'
ORDER BY label;

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

-- Count total Oura variables
SELECT 
    COUNT(*) as total_oura_variables,
    'Total variables with source_type = "oura"' as description
FROM variables 
WHERE source_type = 'oura';

-- Show any remaining variables with "oura" in label (should be 0)
SELECT 
    COUNT(*) as remaining_oura_prefix,
    'Variables still with "oura" prefix in label (should be 0)' as description
FROM variables 
WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%';

-- Show summary of changes
SELECT 
    'UPDATE COMPLETE' as status,
    'Oura variable labels and slugs have been updated, duplicates removed' as message,
    NOW() as updated_at; 