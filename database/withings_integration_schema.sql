-- ============================================================================
-- WITHINGS INTEGRATION SCHEMA
-- ============================================================================

-- ============================================================================
-- WITHINGS TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withings_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id), -- One token set per user
    CONSTRAINT withings_tokens_access_token_check CHECK (access_token IS NOT NULL AND access_token != ''),
    CONSTRAINT withings_tokens_refresh_token_check CHECK (refresh_token IS NOT NULL AND refresh_token != '')
);

-- ============================================================================
-- WITHINGS WEIGHTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withings_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Body composition measurements
    weight_kg DECIMAL(5,2), -- Weight in kilograms
    fat_free_mass_kg DECIMAL(5,2), -- Fat-free mass in kilograms
    fat_ratio DECIMAL(4,2), -- Fat ratio percentage
    fat_mass_weight_kg DECIMAL(5,2), -- Fat mass weight in kilograms
    muscle_mass_kg DECIMAL(5,2), -- Muscle mass in kilograms
    hydration_kg DECIMAL(5,2), -- Hydration in kilograms
    bone_mass_kg DECIMAL(4,2), -- Bone mass in kilograms
    
    -- Raw data from Withings API
    raw_data JSONB, -- Complete raw data from Withings API
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, date), -- One measurement per user per date
    CONSTRAINT withings_weights_weight_kg_check CHECK (weight_kg IS NULL OR weight_kg > 0),
    CONSTRAINT withings_weights_fat_ratio_check CHECK (fat_ratio IS NULL OR (fat_ratio >= 0 AND fat_ratio <= 100)),
    CONSTRAINT withings_weights_date_check CHECK (date IS NOT NULL)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Withings tokens indexes
CREATE INDEX IF NOT EXISTS idx_withings_tokens_user_id ON withings_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_tokens_expires_at ON withings_tokens(expires_at);

-- Withings weights indexes
CREATE INDEX IF NOT EXISTS idx_withings_weights_user_id ON withings_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_weights_date ON withings_weights(date);
CREATE INDEX IF NOT EXISTS idx_withings_weights_weight_kg ON withings_weights(weight_kg);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE withings_weights ENABLE ROW LEVEL SECURITY;

-- Withings tokens policies
CREATE POLICY "Users can view their own Withings tokens" ON withings_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Withings tokens" ON withings_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Withings tokens" ON withings_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Withings tokens" ON withings_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Withings weights policies
CREATE POLICY "Users can view their own Withings weights" ON withings_weights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Withings weights" ON withings_weights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Withings weights" ON withings_weights
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Withings weights" ON withings_weights
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_withings_tokens_updated_at 
    BEFORE UPDATE ON withings_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withings_weights_updated_at 
    BEFORE UPDATE ON withings_weights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 