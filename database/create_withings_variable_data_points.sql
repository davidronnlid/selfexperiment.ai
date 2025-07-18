-- ============================================================================
-- WITHINGS VARIABLE DATA POINTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withings_variable_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable TEXT NOT NULL,
    value DECIMAL(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, date, variable), -- One measurement per user per date per variable
    CONSTRAINT withings_variable_data_points_value_check CHECK (value > 0),
    CONSTRAINT withings_variable_data_points_date_check CHECK (date IS NOT NULL),
    CONSTRAINT withings_variable_data_points_variable_check CHECK (variable IS NOT NULL AND variable != '')
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_id ON withings_variable_data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_date ON withings_variable_data_points(date);
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_variable ON withings_variable_data_points(variable);
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_date ON withings_variable_data_points(user_id, date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE withings_variable_data_points ENABLE ROW LEVEL SECURITY;

-- Withings variable data points policies
CREATE POLICY "Users can view their own Withings variable data points" ON withings_variable_data_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Withings variable data points" ON withings_variable_data_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Withings variable data points" ON withings_variable_data_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Withings variable data points" ON withings_variable_data_points
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_withings_variable_data_points_updated_at 
    BEFORE UPDATE ON withings_variable_data_points 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 