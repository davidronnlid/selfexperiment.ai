-- ============================================================================
-- VARIABLE UNITS TABLE
-- ============================================================================
-- This table creates many-to-many relationships between variables and units
-- with priority and additional metadata

CREATE TABLE IF NOT EXISTS variable_units (
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES units(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    
    -- Additional columns for enhanced functionality
    unit_groups TEXT[] DEFAULT NULL, -- Array of unit groups this variable supports
    default_unit_group TEXT DEFAULT NULL, -- Default unit group to use
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    PRIMARY KEY (variable_id, unit_id),
    CONSTRAINT variable_units_priority_check CHECK (priority > 0),
    CONSTRAINT variable_units_variable_id_check CHECK (variable_id IS NOT NULL),
    CONSTRAINT variable_units_unit_id_check CHECK (unit_id IS NOT NULL AND unit_id != '')
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_variable_units_variable_id ON variable_units(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_units_unit_id ON variable_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_variable_units_priority ON variable_units(priority);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_variable_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER variable_units_updated_at_trigger
    BEFORE UPDATE ON variable_units
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_units_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE variable_units ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read variable_units
CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to manage variable_units (for admin functionality)
CREATE POLICY "Variable units can be managed by authenticated users" ON variable_units
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE variable_units IS 'Many-to-many relationship between variables and units with priority and metadata';
COMMENT ON COLUMN variable_units.variable_id IS 'Reference to the variable ID';
COMMENT ON COLUMN variable_units.unit_id IS 'Reference to the unit ID';
COMMENT ON COLUMN variable_units.priority IS 'Priority order for this unit (lower numbers = higher priority)';
COMMENT ON COLUMN variable_units.note IS 'Optional note about this variable-unit relationship';
COMMENT ON COLUMN variable_units.unit_groups IS 'Array of unit groups this variable supports (e.g., ["mass", "volume"])';
COMMENT ON COLUMN variable_units.default_unit_group IS 'Default unit group to use when user has no preference'; 