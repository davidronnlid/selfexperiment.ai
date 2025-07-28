-- Example: Group Cognitive Control Variables
-- Run this after verifying the migration worked

-- Step 1: Find your Cognitive Control variables
SELECT id, label, slug, source_type, is_active
FROM variables 
WHERE label ILIKE '%cognitive%' 
ORDER BY label;

-- You should see something like:
-- "Subjective cognitive control" (manual)
-- "Cognitive Control" (some other source)

-- Step 2: Decide which should be the parent (Priority 1)
-- Let's say "Cognitive Control" should be the parent
-- Copy the actual IDs from Step 1 results

-- Step 3: Group them (replace IDs with actual values)
/*
UPDATE variables 
SET parent_variable_id = 'parent-variable-id-here'  -- Parent variable ID
WHERE id = 'child-variable-id-here';  -- Child variable ID
*/

-- Step 4: Verify the grouping worked
-- SELECT * FROM get_variable_group('any-variable-id-from-the-group');

-- Step 5: Test getting grouped data (replace with your user ID and variable ID)
/*
SELECT * FROM get_grouped_data_points(
    'any-variable-id-from-group',  
    'bb0ac2ff-72c5-4776-a83a-01855bff4df0'  -- Your user ID
) 
LIMIT 5;
*/

-- Step 6: Check the results
SELECT 
    v.id,
    v.label,
    v.slug,
    v.source_type,
    v.parent_variable_id,
    CASE 
        WHEN v.parent_variable_id IS NULL THEN 'Parent'
        ELSE 'Child'
    END as role
FROM variables v
WHERE v.label ILIKE '%cognitive%'
ORDER BY v.parent_variable_id NULLS FIRST, v.label; 