-- Update Oura Variables Script
-- This script removes "Oura" or "oura" prefix from variable labels
-- and removes the first underscore after "oura" from slugs

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
-- STEP 2: UPDATE VARIABLE LABELS
-- ============================================================================

-- Update labels: remove "Oura" or "oura" prefix
UPDATE variables 
SET 
    label = CASE 
        WHEN label ILIKE 'Oura %' THEN substring(label from 6)  -- Remove "Oura "
        WHEN label ILIKE 'oura %' THEN substring(label from 6)  -- Remove "oura "
        WHEN label ILIKE 'Oura%' THEN substring(label from 5)   -- Remove "Oura"
        WHEN label ILIKE 'oura%' THEN substring(label from 5)   -- Remove "oura"
        ELSE label
    END,
    updated_at = NOW()
WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%';

-- ============================================================================
-- STEP 3: UPDATE VARIABLE SLUGS
-- ============================================================================

-- Update slugs: remove first underscore after "oura"
UPDATE variables 
SET 
    slug = CASE 
        WHEN slug LIKE 'oura_%' THEN 
            'oura' || substring(slug from position('_' in substring(slug from 5)) + 4)
        ELSE slug
    END,
    updated_at = NOW()
WHERE slug LIKE 'oura_%';

-- ============================================================================
-- STEP 4: SHOW RESULTS AFTER UPDATE
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
-- STEP 5: VERIFICATION
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
    'Oura variable labels and slugs have been updated' as message,
    NOW() as updated_at; 