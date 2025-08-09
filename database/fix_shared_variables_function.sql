-- ============================================================================
-- FIX SHARED VARIABLES FUNCTION
-- ============================================================================
-- Update get_user_shared_variables to include data from all sources
-- (data_points, oura_variable_data_points, withings_variable_data_points, apple_health_data_points)

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

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_shared_variables(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_shared_variables(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_shared_variables(UUID) TO service_role;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Test the function with a sample user (replace with actual user ID)
-- SELECT * FROM get_user_shared_variables('your-user-id-here'); 