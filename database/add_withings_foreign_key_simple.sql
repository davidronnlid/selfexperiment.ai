-- Add foreign key constraint to enable joins between withings_variable_data_points and variables
ALTER TABLE withings_variable_data_points 
ADD CONSTRAINT withings_variable_data_points_variable_id_fkey 
FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;

-- Verify the constraint was added
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage 
WHERE table_name = 'withings_variable_data_points' 
    AND column_name = 'variable_id'; 