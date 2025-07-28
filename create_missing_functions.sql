-- ============================================================================
-- CREATE MISSING RPC FUNCTIONS
-- ============================================================================
-- These functions are called in the frontend but may be missing

-- 1. Function to get shared variables for a user
CREATE OR REPLACE FUNCTION get_user_shared_variables(
    target_user_id UUID
)
RETURNS TABLE(
    variable_id UUID,
    variable_label TEXT,
    variable_slug TEXT,
    variable_name TEXT,
    data_point_count BIGINT,
    latest_value TEXT,
    latest_date DATE
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as variable_id,
        v.label as variable_label,
        v.slug as variable_slug,
        v.label as variable_name,
        COUNT(dp.id) as data_point_count,
        (
            SELECT dp2.value 
            FROM data_points dp2 
            WHERE dp2.variable_id = v.id AND dp2.user_id = target_user_id 
            ORDER BY dp2.created_at DESC 
            LIMIT 1
        ) as latest_value,
        (
            SELECT dp2.date 
            FROM data_points dp2 
            WHERE dp2.variable_id = v.id AND dp2.user_id = target_user_id 
            ORDER BY dp2.created_at DESC 
            LIMIT 1
        ) as latest_date
    FROM variables v
    JOIN user_variable_preferences uvp ON uvp.variable_id = v.id
    LEFT JOIN data_points dp ON dp.variable_id = v.id AND dp.user_id = uvp.user_id
    WHERE uvp.user_id = target_user_id
      AND uvp.is_shared = true
    GROUP BY v.id, v.label, v.slug
    ORDER BY data_point_count DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get shared data points for a specific variable
CREATE OR REPLACE FUNCTION get_shared_data_points(
    target_user_id UUID,
    target_variable_id UUID DEFAULT NULL,
    viewer_user_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    variable_id UUID,
    variable_label TEXT,
    value TEXT,
    notes TEXT,
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    source TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If viewer is the same as target user, show all data
    IF target_user_id = viewer_user_id THEN
        RETURN QUERY
        SELECT 
            dp.id,
            dp.user_id,
            dp.variable_id,
            v.label as variable_label,
            dp.value,
            dp.notes,
            dp.date,
            dp.created_at,
            dp.source
        FROM data_points dp
        JOIN variables v ON v.id = dp.variable_id
        WHERE dp.user_id = target_user_id
          AND (target_variable_id IS NULL OR dp.variable_id = target_variable_id)
        ORDER BY dp.created_at DESC
        LIMIT limit_count;
    ELSE
        -- For other viewers, only show data for shared variables
        RETURN QUERY
        SELECT 
            dp.id,
            dp.user_id,
            dp.variable_id,
            v.label as variable_label,
            dp.value,
            dp.notes,
            dp.date,
            dp.created_at,
            dp.source
        FROM data_points dp
        JOIN variables v ON v.id = dp.variable_id
        JOIN user_variable_preferences uvp ON uvp.variable_id = dp.variable_id AND uvp.user_id = dp.user_id
        WHERE dp.user_id = target_user_id
          AND uvp.is_shared = true
          AND (target_variable_id IS NULL OR dp.variable_id = target_variable_id)
        ORDER BY dp.created_at DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get all shared data points (simplified version)
CREATE OR REPLACE FUNCTION get_all_shared_data_points(
    target_user_id UUID,
    viewer_user_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    variable_id UUID,
    variable_label TEXT,
    value TEXT,
    notes TEXT,
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    source TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_shared_data_points(
        target_user_id, 
        NULL, -- all variables
        viewer_user_id, 
        limit_count
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_shared_variables(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shared_data_points(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_shared_data_points(UUID, UUID, INTEGER) TO authenticated;

-- 5. Grant execute permissions to public (for reading shared data)
GRANT EXECUTE ON FUNCTION get_user_shared_variables(UUID) TO public;
GRANT EXECUTE ON FUNCTION get_shared_data_points(UUID, UUID, UUID, INTEGER) TO public;
GRANT EXECUTE ON FUNCTION get_all_shared_data_points(UUID, UUID, INTEGER) TO public;

SELECT '✅ RPC functions created successfully!' as result; 