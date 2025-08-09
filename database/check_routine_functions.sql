-- Check if required routine functions exist
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('create_routine', 'update_routine', 'delete_routine');