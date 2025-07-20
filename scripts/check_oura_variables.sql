-- Check current Oura variables before updating
-- Run this first to see what will be changed

SELECT 
    id,
    slug,
    label,
    source_type,
    category,
    created_at
FROM variables 
WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%'
ORDER BY label;

-- Show count of variables that will be affected
SELECT 
    COUNT(*) as variables_to_update,
    'Variables with label starting with "oura" or "Oura"' as description
FROM variables 
WHERE label ILIKE 'oura%' OR label ILIKE 'Oura%'; 