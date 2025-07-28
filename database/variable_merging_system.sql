-- ============================================================================
-- VARIABLE MERGING SYSTEM
-- Allows multiple data sources to contribute to the same logical variable
-- while maintaining source transparency and enabling correlation analysis
-- ============================================================================

-- Variable merging groups - defines which variables should be merged
CREATE TABLE IF NOT EXISTS variable_merge_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- e.g., "Body Weight", "Heart Rate", "Sleep Duration"
    slug TEXT UNIQUE NOT NULL, -- e.g., "body_weight", "heart_rate", "sleep_duration"
    description TEXT,
    canonical_unit TEXT NOT NULL, -- Unified unit for all merged variables
    unit_group TEXT, -- For unit conversion
    category TEXT,
    
    -- Display preferences
    primary_source TEXT, -- Which source to prioritize in displays
    display_order INTEGER DEFAULT 0,
    
    -- Analytics settings
    enable_correlation_analysis BOOLEAN DEFAULT true,
    min_data_points_for_correlation INTEGER DEFAULT 10,
    correlation_window_days INTEGER DEFAULT 30, -- Rolling window for correlation
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Maps individual variables to merge groups
CREATE TABLE IF NOT EXISTS variable_merge_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merge_group_id UUID REFERENCES variable_merge_groups(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Source information
    data_source TEXT NOT NULL, -- e.g., "withings", "apple_health", "manual"
    source_priority INTEGER DEFAULT 1, -- Higher number = higher priority
    
    -- Unit conversion for this source
    source_unit TEXT, -- Original unit from this source
    conversion_factor DECIMAL(10,6) DEFAULT 1.0, -- Multiplier to canonical unit
    conversion_offset DECIMAL(10,6) DEFAULT 0.0, -- Additive offset
    
    -- Quality metrics
    typical_accuracy_percentage DECIMAL(5,2), -- Expected accuracy %
    measurement_precision DECIMAL(10,6), -- Smallest meaningful change
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(merge_group_id, variable_id),
    UNIQUE(merge_group_id, data_source) -- One variable per source per group
);

-- Stores correlation analysis results between data sources
CREATE TABLE IF NOT EXISTS variable_source_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merge_group_id UUID REFERENCES variable_merge_groups(id) ON DELETE CASCADE,
    source_a TEXT NOT NULL,
    source_b TEXT NOT NULL,
    
    -- Correlation metrics
    pearson_correlation DECIMAL(10,6), -- -1 to 1
    spearman_correlation DECIMAL(10,6), -- -1 to 1
    intraclass_correlation DECIMAL(10,6), -- 0 to 1 (most important for agreement)
    concordance_correlation DECIMAL(10,6), -- 0 to 1
    
    -- Analysis parameters
    data_points_count INTEGER,
    analysis_start_date DATE,
    analysis_end_date DATE,
    analysis_window_days INTEGER,
    
    -- Statistical significance
    p_value DECIMAL(10,6),
    confidence_interval_lower DECIMAL(10,6),
    confidence_interval_upper DECIMAL(10,6),
    
    -- Quality metrics
    mean_absolute_error DECIMAL(10,6),
    root_mean_square_error DECIMAL(10,6),
    mean_bias DECIMAL(10,6), -- Systematic difference between sources
    
    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculation_version TEXT DEFAULT '1.0',
    
    UNIQUE(merge_group_id, source_a, source_b, analysis_start_date)
);

-- User preferences for merged variables
CREATE TABLE IF NOT EXISTS user_merge_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merge_group_id UUID REFERENCES variable_merge_groups(id) ON DELETE CASCADE,
    
    -- Display preferences
    preferred_source TEXT, -- Which source to show prominently
    show_all_sources BOOLEAN DEFAULT true,
    show_correlation_info BOOLEAN DEFAULT true,
    
    -- Data preferences
    enable_data_fusion BOOLEAN DEFAULT false, -- Combine readings from multiple sources
    fusion_method TEXT DEFAULT 'weighted_average', -- averaging, kalman_filter, etc.
    
    -- Alert preferences
    alert_on_source_disagreement BOOLEAN DEFAULT false,
    disagreement_threshold_percentage DECIMAL(5,2) DEFAULT 10.0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, merge_group_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_variable_merge_groups_slug ON variable_merge_groups(slug);
CREATE INDEX IF NOT EXISTS idx_variable_merge_groups_active ON variable_merge_groups(is_active);

CREATE INDEX IF NOT EXISTS idx_variable_merge_mappings_group ON variable_merge_mappings(merge_group_id);
CREATE INDEX IF NOT EXISTS idx_variable_merge_mappings_variable ON variable_merge_mappings(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_merge_mappings_source ON variable_merge_mappings(data_source);

CREATE INDEX IF NOT EXISTS idx_variable_source_correlations_group ON variable_source_correlations(merge_group_id);
CREATE INDEX IF NOT EXISTS idx_variable_source_correlations_date ON variable_source_correlations(analysis_start_date);

CREATE INDEX IF NOT EXISTS idx_user_merge_preferences_user ON user_merge_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_merge_preferences_group ON user_merge_preferences(merge_group_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE variable_merge_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_merge_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE variable_source_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_merge_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read merge groups and mappings (public configuration)
CREATE POLICY "Allow read access to merge groups" ON variable_merge_groups
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to merge mappings" ON variable_merge_mappings
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to correlations" ON variable_source_correlations
    FOR SELECT USING (true);

-- Policy: Users can only access their own preferences
CREATE POLICY "Users can manage own merge preferences" ON user_merge_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- EXAMPLE DATA - Body Weight Merging
-- ============================================================================

-- Create a merge group for body weight
INSERT INTO variable_merge_groups (
    name, slug, description, canonical_unit, unit_group, category,
    primary_source, enable_correlation_analysis
) VALUES (
    'Body Weight',
    'body_weight', 
    'Body weight measurements from multiple sources (Withings scale, Apple Health, manual entry)',
    'kg',
    'mass',
    'Physical Health',
    'withings',
    true
) ON CONFLICT (slug) DO NOTHING;

-- Example: Map Withings weight variable to the merge group
-- (You'll need to replace these UUIDs with actual variable IDs)
INSERT INTO variable_merge_mappings (
    merge_group_id,
    variable_id,
    data_source,
    source_priority,
    source_unit,
    typical_accuracy_percentage,
    measurement_precision
) VALUES (
    (SELECT id FROM variable_merge_groups WHERE slug = 'body_weight'),
    (SELECT id FROM variables WHERE slug LIKE '%weight%' AND (source_type = 'withings' OR label ILIKE '%withings%') LIMIT 1),
    'withings',
    3, -- Highest priority (scale is most accurate)
    'kg',
    99.5, -- Very accurate
    0.1 -- 100g precision
) ON CONFLICT (merge_group_id, data_source) DO NOTHING;

-- Map Apple Health weight to the same group
INSERT INTO variable_merge_mappings (
    merge_group_id,
    variable_id,
    data_source,
    source_priority,
    source_unit,
    typical_accuracy_percentage,
    measurement_precision
) VALUES (
    (SELECT id FROM variable_merge_groups WHERE slug = 'body_weight'),
    (SELECT id FROM variables WHERE slug = 'apple_health_weight' LIMIT 1),
    'apple_health',
    2, -- Medium priority
    'kg',
    95.0, -- Good accuracy but depends on input device
    0.1
) ON CONFLICT (merge_group_id, data_source) DO NOTHING;

-- ============================================================================
-- FUNCTIONS FOR CORRELATION ANALYSIS
-- ============================================================================

-- Function to calculate intraclass correlation coefficient
CREATE OR REPLACE FUNCTION calculate_intraclass_correlation(
    group_id UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    source_a TEXT,
    source_b TEXT,
    icc DECIMAL(10,6),
    data_points INTEGER,
    p_value DECIMAL(10,6)
) AS $$
BEGIN
    -- This is a simplified version - you'd implement proper ICC calculation
    -- For now, returns placeholder data
    RETURN QUERY
    SELECT 
        mapping1.data_source as source_a,
        mapping2.data_source as source_b,
        0.85::DECIMAL(10,6) as icc, -- Placeholder
        50 as data_points,
        0.001::DECIMAL(10,6) as p_value
    FROM variable_merge_mappings mapping1
    JOIN variable_merge_mappings mapping2 ON mapping1.merge_group_id = mapping2.merge_group_id
    WHERE mapping1.merge_group_id = group_id
    AND mapping1.data_source < mapping2.data_source; -- Avoid duplicates
END;
$$ LANGUAGE plpgsql;

-- Function to get merged variable data with source information
CREATE OR REPLACE FUNCTION get_merged_variable_data(
    group_slug TEXT,
    user_id_param UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    date DATE,
    value DECIMAL(10,4),
    source TEXT,
    variable_id UUID,
    original_value DECIMAL(10,4),
    original_unit TEXT,
    data_point_id UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH merge_group AS (
        SELECT id, canonical_unit FROM variable_merge_groups WHERE slug = group_slug
    ),
    mapped_variables AS (
        SELECT 
            vmm.variable_id,
            vmm.data_source,
            vmm.conversion_factor,
            vmm.conversion_offset,
            vmm.source_unit,
            vmm.source_priority
        FROM variable_merge_mappings vmm
        JOIN merge_group mg ON vmm.merge_group_id = mg.id
        WHERE vmm.is_active = true
    )
    SELECT 
        dp.date,
        (CAST(dp.value AS DECIMAL(10,4)) * mv.conversion_factor + mv.conversion_offset) as value,
        mv.data_source as source,
        dp.variable_id,
        CAST(dp.value AS DECIMAL(10,4)) as original_value,
        mv.source_unit as original_unit,
        dp.id as data_point_id
    FROM data_points dp
    JOIN mapped_variables mv ON dp.variable_id = mv.variable_id
    WHERE dp.user_id = user_id_param
    AND dp.date BETWEEN start_date AND end_date
    AND dp.value IS NOT NULL
    ORDER BY dp.date DESC, mv.source_priority DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE variable_merge_groups IS 'Defines logical groups of variables that should be merged across data sources';
COMMENT ON TABLE variable_merge_mappings IS 'Maps individual variables to merge groups with source-specific metadata';
COMMENT ON TABLE variable_source_correlations IS 'Stores correlation analysis results between different data sources';
COMMENT ON TABLE user_merge_preferences IS 'User preferences for how merged variables should be displayed and analyzed'; 