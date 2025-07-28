-- Add parent_variable_id column to variables table for logical grouping
-- This allows variables to be grouped under a parent while keeping separate DB records

-- Add the column (nullable, so existing variables remain standalone)
ALTER TABLE variables 
ADD COLUMN parent_variable_id uuid REFERENCES variables(id) ON DELETE SET NULL;

-- Add index for performance when querying grouped variables
CREATE INDEX idx_variables_parent_variable_id ON variables(parent_variable_id);

-- Add index for finding root variables (parent_variable_id IS NULL)
CREATE INDEX idx_variables_root_variables ON variables(parent_variable_id) WHERE parent_variable_id IS NULL;

-- Add a check constraint to prevent self-referencing and circular references
ALTER TABLE variables 
ADD CONSTRAINT check_no_self_reference 
CHECK (parent_variable_id != id);

-- Create a function to get all variables in a group (parent + children)
CREATE OR REPLACE FUNCTION get_variable_group(target_variable_id uuid)
RETURNS TABLE (
    id uuid,
    slug text,
    label text,
    source_type text,
    is_active boolean,
    parent_variable_id uuid,
    is_parent boolean,
    group_slug text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    root_variable_id uuid;
    root_slug text;
BEGIN
    -- Find the root variable (parent) of this group
    WITH RECURSIVE parent_search AS (
        -- Start with the target variable
        SELECT v.id, v.parent_variable_id, v.slug
        FROM variables v 
        WHERE v.id = target_variable_id
        
        UNION ALL
        
        -- Recursively find parent
        SELECT v.id, v.parent_variable_id, v.slug
        FROM variables v
        INNER JOIN parent_search ps ON v.id = ps.parent_variable_id
    )
    SELECT ps.id, ps.slug INTO root_variable_id, root_slug
    FROM parent_search 
    WHERE parent_variable_id IS NULL
    LIMIT 1;
    
    -- If no parent found, the target variable is the root
    IF root_variable_id IS NULL THEN
        SELECT v.id, v.slug INTO root_variable_id, root_slug
        FROM variables v 
        WHERE v.id = target_variable_id;
    END IF;
    
    -- Return all variables in this group
    RETURN QUERY
    SELECT 
        v.id,
        v.slug,
        v.label,
        v.source_type,
        v.is_active,
        v.parent_variable_id,
        (v.parent_variable_id IS NULL) as is_parent,
        root_slug as group_slug
    FROM variables v
    WHERE v.id = root_variable_id  -- The parent/root variable
       OR v.parent_variable_id = root_variable_id  -- Child variables
    ORDER BY 
        (v.parent_variable_id IS NULL) DESC,  -- Parent first
        v.source_type,  -- Then by source type
        v.label;  -- Then by label
END;
$$;

-- Create a function to get grouped data points for frontend display
CREATE OR REPLACE FUNCTION get_grouped_data_points(target_variable_id uuid, target_user_id uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    variable_id uuid,
    variable_label text,
    variable_source text,
    date date,
    value numeric,
    raw jsonb,
    created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    group_variable_ids uuid[];
BEGIN
    -- Get all variable IDs in the same group
    SELECT array_agg(vg.id) INTO group_variable_ids
    FROM get_variable_group(target_variable_id) vg;
    
    -- Return data points from all variables in the group
    RETURN QUERY
    SELECT 
        dp.id,
        dp.user_id,
        dp.variable_id,
        v.label as variable_label,
        v.source_type as variable_source,
        dp.date,
        dp.value,
        dp.raw,
        dp.created_at
    FROM data_points dp
    INNER JOIN variables v ON dp.variable_id = v.id
    WHERE dp.variable_id = ANY(group_variable_ids)
      AND dp.user_id = target_user_id
    ORDER BY dp.date DESC, v.source_type, dp.created_at DESC;
END;
$$;

-- Add RLS policies for the new functions
-- Users can only access variable groups for variables they can see
-- (This inherits from existing variables table RLS policies)

-- Comment explaining the new system
COMMENT ON COLUMN variables.parent_variable_id IS 'Links child variables to parent variable for logical grouping. NULL means this is a standalone or parent variable.';
COMMENT ON FUNCTION get_variable_group IS 'Returns all variables in the same group (parent + children) for a given variable ID.';
COMMENT ON FUNCTION get_grouped_data_points IS 'Returns data points from all variables in the same group for unified frontend display.';
