-- Check if the RPC functions exist that are called by the frontend
SELECT 
    routine_name, 
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN (
        'get_user_shared_variables', 
        'get_shared_data_points', 
        'get_all_shared_data_points'
    )
ORDER BY routine_name; 