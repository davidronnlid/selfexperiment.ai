-- Remove " (base)" suffix from all unit labels in the database

-- Update all units that have " (base)" in their label
UPDATE units 
SET label = REPLACE(label, ' (base)', '')
WHERE label LIKE '% (base)';

-- Show the updated units
SELECT 'Units updated - removed " (base)" suffix:' as info;
SELECT id, label, symbol, unit_group, is_base
FROM units 
WHERE is_base = true
ORDER BY unit_group, label;
