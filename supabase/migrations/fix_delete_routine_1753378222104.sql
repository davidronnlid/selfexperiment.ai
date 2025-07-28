
-- Fix the delete_routine function to work with the existing routines table
DROP FUNCTION IF EXISTS delete_routine(UUID);

CREATE OR REPLACE FUNCTION delete_routine(p_routine_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete the routine from the routines table
    -- This will cascade delete related records due to foreign key constraints
    DELETE FROM public.routines WHERE id = p_routine_id;
END;
$$;
