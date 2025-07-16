-- Fix the relationship between logs and variables tables
-- This ensures proper foreign key constraints and enables Supabase joins

-- First, check if the foreign key constraint exists
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'logs_variable_id_fkey' 
        AND table_name = 'logs'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE logs 
        ADD CONSTRAINT logs_variable_id_fkey 
        FOREIGN KEY (variable_id) 
        REFERENCES variables(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint logs_variable_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint logs_variable_id_fkey already exists';
    END IF;
END
$$;

-- Create an index on variable_id for better query performance
CREATE INDEX IF NOT EXISTS idx_logs_variable_id ON logs(variable_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id_date ON logs(user_id, date);

-- Verify the relationship works
DO $$
DECLARE
    logs_count INTEGER;
    variables_count INTEGER;
    orphaned_logs INTEGER;
BEGIN
    SELECT COUNT(*) INTO logs_count FROM logs;
    SELECT COUNT(*) INTO variables_count FROM variables;
    
    -- Check for orphaned logs (logs with variable_id not in variables table)
    SELECT COUNT(*) INTO orphaned_logs 
    FROM logs l 
    LEFT JOIN variables v ON l.variable_id = v.id 
    WHERE v.id IS NULL;
    
    RAISE NOTICE 'Database relationship verification:';
    RAISE NOTICE '  - Total logs: %', logs_count;
    RAISE NOTICE '  - Total variables: %', variables_count;
    RAISE NOTICE '  - Orphaned logs: %', orphaned_logs;
    
    IF orphaned_logs > 0 THEN
        RAISE WARNING 'Found % orphaned logs that reference non-existent variables', orphaned_logs;
    ELSE
        RAISE NOTICE 'All logs have valid variable references';
    END IF;
END
$$; 