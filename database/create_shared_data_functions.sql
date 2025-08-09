-- ============================================================================
-- SHARED DATA FUNCTIONS
-- ============================================================================
-- Functions to fetch data points that users have marked as shared via 
-- user_variable_preferences.is_shared = true

-- Function to get shared data points for a specific user and variable
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
) AS $$
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
            dp.date::DATE,
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
            dp.date::DATE,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shared variables for a user (ones they have data for and have marked as shared)
CREATE OR REPLACE FUNCTION get_user_shared_variables(
    target_user_id UUID
)
RETURNS TABLE(
    variable_id UUID,
    variable_label TEXT,
    variable_slug TEXT,
    variable_icon TEXT,
    data_point_count BIGINT,
    latest_value TEXT,
    latest_date DATE,
    is_shared BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as variable_id,
        v.label as variable_label,
        v.slug as variable_slug,
        v.icon as variable_icon,
        COALESCE(
            (SELECT COUNT(*) FROM data_points dp WHERE dp.variable_id = v.id AND dp.user_id = target_user_id) +
            (SELECT COUNT(*) FROM oura_variable_data_points ovd WHERE ovd.variable_id = v.id AND ovd.user_id = target_user_id) +
            (SELECT COUNT(*) FROM withings_variable_data_points wvd WHERE wvd.variable_id = v.id AND wvd.user_id = target_user_id) +
            (SELECT COUNT(*) FROM apple_health_data_points ahd WHERE ahd.variable_id = v.id AND ahd.user_id = target_user_id),
            0
        ) as data_point_count,
        (
            SELECT COALESCE(
                (SELECT dp2.value FROM data_points dp2 WHERE dp2.variable_id = v.id AND dp2.user_id = target_user_id ORDER BY dp2.created_at DESC LIMIT 1),
                (SELECT ovd2.value::TEXT FROM oura_variable_data_points ovd2 WHERE ovd2.variable_id = v.id AND ovd2.user_id = target_user_id ORDER BY ovd2.created_at DESC LIMIT 1),
                (SELECT wvd2.value::TEXT FROM withings_variable_data_points wvd2 WHERE wvd2.variable_id = v.id AND wvd2.user_id = target_user_id ORDER BY wvd2.created_at DESC LIMIT 1),
                (SELECT ahd2.value FROM apple_health_data_points ahd2 WHERE ahd2.variable_id = v.id AND ahd2.user_id = target_user_id ORDER BY ahd2.created_at DESC LIMIT 1)
            )
        ) as latest_value,
        (
            SELECT COALESCE(
                (SELECT dp2.date::DATE FROM data_points dp2 WHERE dp2.variable_id = v.id AND dp2.user_id = target_user_id ORDER BY dp2.created_at DESC LIMIT 1),
                (SELECT ovd2.date::DATE FROM oura_variable_data_points ovd2 WHERE ovd2.variable_id = v.id AND ovd2.user_id = target_user_id ORDER BY ovd2.created_at DESC LIMIT 1),
                (SELECT wvd2.date::DATE FROM withings_variable_data_points wvd2 WHERE wvd2.variable_id = v.id AND wvd2.user_id = target_user_id ORDER BY wvd2.created_at DESC LIMIT 1),
                (SELECT ahd2.date::DATE FROM apple_health_data_points ahd2 WHERE ahd2.variable_id = v.id AND ahd2.user_id = target_user_id ORDER BY ahd2.created_at DESC LIMIT 1)
            )
        ) as latest_date,
        uvp.is_shared
    FROM variables v
    JOIN user_variable_preferences uvp ON uvp.variable_id = v.id
    WHERE uvp.user_id = target_user_id
      AND uvp.is_shared = true
      AND (
          -- Only include variables that have data in any of the data point tables
          EXISTS (SELECT 1 FROM data_points dp WHERE dp.variable_id = v.id AND dp.user_id = target_user_id) OR
          EXISTS (SELECT 1 FROM oura_variable_data_points ovd WHERE ovd.variable_id = v.id AND ovd.user_id = target_user_id) OR
          EXISTS (SELECT 1 FROM withings_variable_data_points wvd WHERE wvd.variable_id = v.id AND wvd.user_id = target_user_id) OR
          EXISTS (SELECT 1 FROM apple_health_data_points ahd WHERE ahd.variable_id = v.id AND ahd.user_id = target_user_id)
      )
    GROUP BY v.id, v.label, v.slug, v.icon, uvp.is_shared
    ORDER BY data_point_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shared data from all sources (data_points, oura, withings)
CREATE OR REPLACE FUNCTION get_all_shared_data_points(
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
) AS $$
BEGIN
    -- If viewer is the same as target user, show all data
    IF target_user_id = viewer_user_id THEN
        RETURN QUERY
        -- Manual/routine data points
        SELECT 
            dp.id,
            dp.user_id,
            dp.variable_id,
            v.label as variable_label,
            dp.value,
            dp.notes,
            dp.date::DATE,
            dp.created_at,
            COALESCE(dp.source, 'manual') as source
        FROM data_points dp
        JOIN variables v ON v.id = dp.variable_id
        WHERE dp.user_id = target_user_id
          AND (target_variable_id IS NULL OR dp.variable_id = target_variable_id)
        
        UNION ALL
        
        -- Oura data points
        SELECT 
            ovd.id,
            ovd.user_id,
            ovd.variable_id,
            v.label as variable_label,
            ovd.value::TEXT,
            'Oura Ring data' as notes,
            ovd.date::DATE,
            ovd.created_at,
            'oura' as source
        FROM oura_variable_data_points ovd
        JOIN variables v ON v.id = ovd.variable_id
        WHERE ovd.user_id = target_user_id
          AND (target_variable_id IS NULL OR ovd.variable_id = target_variable_id)
        
        UNION ALL
        
        -- Withings data points
        SELECT 
            wvd.id,
            wvd.user_id,
            wvd.variable_id,
            v.label as variable_label,
            wvd.value::TEXT,
            'Withings data' as notes,
            wvd.date::DATE,
            wvd.created_at,
            'withings' as source
        FROM withings_variable_data_points wvd
        JOIN variables v ON v.id = wvd.variable_id
        WHERE wvd.user_id = target_user_id
          AND (target_variable_id IS NULL OR wvd.variable_id = target_variable_id)
        
        ORDER BY created_at DESC
        LIMIT limit_count;
    ELSE
        -- For other viewers, only show data for shared variables
        RETURN QUERY
        -- Manual/routine data points
        SELECT 
            dp.id,
            dp.user_id,
            dp.variable_id,
            v.label as variable_label,
            dp.value,
            dp.notes,
            dp.date::DATE,
            dp.created_at,
            COALESCE(dp.source, 'manual') as source
        FROM data_points dp
        JOIN variables v ON v.id = dp.variable_id
        JOIN user_variable_preferences uvp ON uvp.variable_id = dp.variable_id AND uvp.user_id = dp.user_id
        WHERE dp.user_id = target_user_id
          AND uvp.is_shared = true
          AND (target_variable_id IS NULL OR dp.variable_id = target_variable_id)
        
        UNION ALL
        
        -- Oura data points
        SELECT 
            ovd.id,
            ovd.user_id,
            ovd.variable_id,
            v.label as variable_label,
            ovd.value::TEXT,
            'Oura Ring data' as notes,
            ovd.date::DATE,
            ovd.created_at,
            'oura' as source
        FROM oura_variable_data_points ovd
        JOIN variables v ON v.id = ovd.variable_id
        JOIN user_variable_preferences uvp ON uvp.variable_id = ovd.variable_id AND uvp.user_id = ovd.user_id
        WHERE ovd.user_id = target_user_id
          AND uvp.is_shared = true
          AND (target_variable_id IS NULL OR ovd.variable_id = target_variable_id)
        
        UNION ALL
        
        -- Withings data points
        SELECT 
            wvd.id,
            wvd.user_id,
            wvd.variable_id,
            v.label as variable_label,
            wvd.value::TEXT,
            'Withings data' as notes,
            wvd.date::DATE,
            wvd.created_at,
            'withings' as source
        FROM withings_variable_data_points wvd
        JOIN variables v ON v.id = wvd.variable_id
        JOIN user_variable_preferences uvp ON uvp.variable_id = wvd.variable_id AND uvp.user_id = wvd.user_id
        WHERE wvd.user_id = target_user_id
          AND uvp.is_shared = true
          AND (target_variable_id IS NULL OR wvd.variable_id = target_variable_id)
        
        ORDER BY created_at DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a variable is shared by a user
CREATE OR REPLACE FUNCTION is_variable_shared(
    target_user_id UUID,
    target_variable_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_shared_result BOOLEAN;
BEGIN
    SELECT uvp.is_shared INTO is_shared_result
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = target_user_id
      AND uvp.variable_id = target_variable_id;
    
    RETURN COALESCE(is_shared_result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_shared_data_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_shared_variables TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_shared_data_points TO authenticated;
GRANT EXECUTE ON FUNCTION is_variable_shared TO authenticated;

-- Grant permissions to service role
GRANT EXECUTE ON FUNCTION get_shared_data_points TO service_role;
GRANT EXECUTE ON FUNCTION get_user_shared_variables TO service_role;
GRANT EXECUTE ON FUNCTION get_all_shared_data_points TO service_role;
GRANT EXECUTE ON FUNCTION is_variable_shared TO service_role;

SELECT '✅ Shared data functions created successfully!' as result; 