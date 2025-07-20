-- Add foreign key constraint between withings_variable_data_points and variables tables
-- This enables proper joins in Supabase queries

-- First, check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'withings_variable_data_points_variable_id_fkey'
        AND table_name = 'withings_variable_data_points'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE withings_variable_data_points 
        ADD CONSTRAINT withings_variable_data_points_variable_id_fkey 
        FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint: withings_variable_data_points_variable_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists: withings_variable_data_points_variable_id_fkey';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'withings_variable_data_points'
    AND kcu.column_name = 'variable_id'; 