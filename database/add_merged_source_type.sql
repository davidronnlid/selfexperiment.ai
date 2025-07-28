-- Add 'merged' to the source_type constraint for variables table
-- This allows variables to be marked as merged from multiple sources

-- Drop the existing constraint
ALTER TABLE variables 
DROP CONSTRAINT IF EXISTS variables_source_type_check;

-- Add the updated constraint with 'merged' included
ALTER TABLE variables 
ADD CONSTRAINT variables_source_type_check 
CHECK (source_type IN ('manual', 'withings', 'oura', 'apple_health', 'formula', 'calculated', 'merged'));

-- Verify the constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'variables_source_type_check'; 