-- Test script to verify Variable Grouping System is working

-- 1. Check that parent_variable_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'variables' AND column_name = 'parent_variable_id';

-- 2. Check that the functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('get_variable_group', 'get_grouped_data_points')
  AND routine_schema = 'public';

-- 3. Find variables that could be grouped (Steps example)
SELECT id, label, slug, source_type, parent_variable_id 
FROM variables 
WHERE label ILIKE '%steps%' 
ORDER BY source_type;

-- 4. Find Cognitive Control variables specifically 
SELECT id, label, slug, source_type, parent_variable_id, is_active
FROM variables 
WHERE label ILIKE '%cognitive%' 
ORDER BY label;

-- 5. Test the grouping function (replace with actual variable ID)
-- SELECT * FROM get_variable_group('your-variable-id-here');

-- 6. Show all root variables (no parent)
SELECT COUNT(*) as root_variables_count
FROM variables 
WHERE parent_variable_id IS NULL AND is_active = true;

-- 7. Show any existing grouped variables
SELECT COUNT(*) as grouped_variables_count
FROM variables 
WHERE parent_variable_id IS NOT NULL; 