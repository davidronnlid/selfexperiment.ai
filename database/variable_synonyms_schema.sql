-- Variable Synonyms System Database Schema
-- Adds support for multiple labels/names pointing to the same variable

-- ============================================================================
-- ADD SYNONYM SUPPORT TO VARIABLES TABLE
-- ============================================================================

-- Add synonym-related columns to existing variables table
ALTER TABLE variables 
ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '', -- The main/canonical label
ADD COLUMN IF NOT EXISTS search_labels TEXT[] DEFAULT '{}', -- Array of all searchable labels including synonyms
ADD COLUMN IF NOT EXISTS synonym_count INTEGER DEFAULT 0; -- Count of synonyms for this variable

-- Update existing variables to set primary_label = label
UPDATE variables 
SET label = label 
WHERE primary_label = '' OR primary_label IS NULL;

-- ============================================================================
-- VARIABLE SYNONYMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS variable_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    synonym_label TEXT NOT NULL, -- The synonym text
    synonym_type TEXT DEFAULT 'user' CHECK (synonym_type IN ('system', 'user', 'common')), -- Who created this synonym
    language TEXT DEFAULT 'en', -- Language code for the synonym
    is_primary BOOLEAN DEFAULT false, -- Whether this is the primary label for the variable
    search_weight INTEGER DEFAULT 1, -- Higher weight = higher priority in search results
    created_by UUID REFERENCES auth.users(id), -- Who created this synonym (if user-created)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(variable_id, synonym_label, language), -- No duplicate synonyms per variable per language
    CONSTRAINT variable_synonyms_label_check CHECK (synonym_label IS NOT NULL AND synonym_label != '')
);

-- ============================================================================
-- VARIABLE SEARCH INDEX TABLE (for full-text search)
-- ============================================================================

CREATE TABLE IF NOT EXISTS variable_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    search_text TEXT NOT NULL, -- Normalized search text
    search_type TEXT DEFAULT 'label' CHECK (search_type IN ('label', 'description', 'synonym', 'tag')),
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(variable_id, search_text, search_type, language)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Variables table indexes for synonym support
CREATE INDEX IF NOT EXISTS idx_variables_primary_label ON variables(primary_label);
CREATE INDEX IF NOT EXISTS idx_variables_search_labels ON variables USING GIN(search_labels);
CREATE INDEX IF NOT EXISTS idx_variables_synonym_count ON variables(synonym_count);

-- Variable synonyms indexes
CREATE INDEX IF NOT EXISTS idx_variable_synonyms_variable_id ON variable_synonyms(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_synonyms_label ON variable_synonyms(synonym_label);
CREATE INDEX IF NOT EXISTS idx_variable_synonyms_language ON variable_synonyms(language);
CREATE INDEX IF NOT EXISTS idx_variable_synonyms_type ON variable_synonyms(synonym_type);
CREATE INDEX IF NOT EXISTS idx_variable_synonyms_search_weight ON variable_synonyms(search_weight);
CREATE INDEX IF NOT EXISTS idx_variable_synonyms_is_primary ON variable_synonyms(is_primary);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_variable_search_index_variable_id ON variable_search_index(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_search_index_search_text ON variable_search_index(search_text);
CREATE INDEX IF NOT EXISTS idx_variable_search_index_type ON variable_search_index(search_type);
CREATE INDEX IF NOT EXISTS idx_variable_search_index_language ON variable_search_index(language);

-- Full-text search index for PostgreSQL text search
CREATE INDEX IF NOT EXISTS idx_variable_search_index_fts ON variable_search_index USING GIN(to_tsvector('english', search_text));

-- ============================================================================
-- FUNCTIONS FOR SYNONYM MANAGEMENT
-- ============================================================================

-- Function to update search_labels array when synonyms change
CREATE OR REPLACE FUNCTION update_variable_search_labels()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the search_labels array in variables table
    UPDATE variables 
    SET 
        search_labels = (
            SELECT array_agg(DISTINCT synonym_label ORDER BY synonym_label)
            FROM variable_synonyms 
            WHERE variable_id = NEW.variable_id
        ),
        synonym_count = (
            SELECT COUNT(*) 
            FROM variable_synonyms 
            WHERE variable_id = NEW.variable_id
        )
    WHERE id = NEW.variable_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search_labels when synonyms are deleted
CREATE OR REPLACE FUNCTION update_variable_search_labels_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the search_labels array in variables table
    UPDATE variables 
    SET 
        search_labels = (
            SELECT array_agg(DISTINCT synonym_label ORDER BY synonym_label)
            FROM variable_synonyms 
            WHERE variable_id = OLD.variable_id
        ),
        synonym_count = (
            SELECT COUNT(*) 
            FROM variable_synonyms 
            WHERE variable_id = OLD.variable_id
        )
    WHERE id = OLD.variable_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to update search index when synonyms change
CREATE OR REPLACE FUNCTION update_variable_search_index()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing search index entries for this variable
    DELETE FROM variable_search_index WHERE variable_id = NEW.variable_id;
    
    -- Insert new search index entries
    INSERT INTO variable_search_index (variable_id, search_text, search_type, language)
    SELECT 
        NEW.variable_id,
        synonym_label,
        'synonym',
        language
    FROM variable_synonyms 
    WHERE variable_id = NEW.variable_id;
    
    -- Also add the primary label
    INSERT INTO variable_search_index (variable_id, search_text, search_type, language)
    SELECT 
        NEW.variable_id,
        primary_label,
        'label',
        'en'
    FROM variables 
    WHERE id = NEW.variable_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update search_labels when synonyms are inserted/updated
CREATE TRIGGER trigger_update_variable_search_labels
    AFTER INSERT OR UPDATE ON variable_synonyms
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_search_labels();

-- Trigger to update search_labels when synonyms are deleted
CREATE TRIGGER trigger_update_variable_search_labels_delete
    AFTER DELETE ON variable_synonyms
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_search_labels_delete();

-- Trigger to update search index when synonyms change
CREATE TRIGGER trigger_update_variable_search_index
    AFTER INSERT OR UPDATE OR DELETE ON variable_synonyms
    FOR EACH ROW
    EXECUTE FUNCTION update_variable_search_index();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Variable synonyms policies
ALTER TABLE variable_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variable synonyms are viewable by all authenticated users" ON variable_synonyms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create synonyms for variables" ON variable_synonyms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own synonyms" ON variable_synonyms
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own synonyms" ON variable_synonyms
    FOR DELETE USING (auth.uid() = created_by);

-- Variable search index policies
ALTER TABLE variable_search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variable search index is viewable by all authenticated users" ON variable_search_index
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- INITIAL DATA MIGRATION
-- ============================================================================

-- Migrate existing variable labels to synonyms
INSERT INTO variable_synonyms (variable_id, synonym_label, synonym_type, is_primary, search_weight)
SELECT 
    id,
    label,
    'system',
    true,
    10
FROM variables
ON CONFLICT (variable_id, synonym_label, language) DO NOTHING;

-- Update search_labels for existing variables
UPDATE variables 
SET search_labels = ARRAY[label]
WHERE search_labels IS NULL OR array_length(search_labels, 1) IS NULL;

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

-- Example: Add synonyms for "Weight" variable
-- INSERT INTO variable_synonyms (variable_id, synonym_label, synonym_type, search_weight) VALUES
--     ((SELECT id FROM variables WHERE slug = 'weight'), 'Body Weight', 'system', 8),
--     ((SELECT id FROM variables WHERE slug = 'weight'), 'Mass', 'system', 6),
--     ((SELECT id FROM variables WHERE slug = 'weight'), 'Scale Weight', 'user', 5);

-- Example: Search for variables by synonym
-- SELECT DISTINCT v.* 
-- FROM variables v
-- JOIN variable_synonyms vs ON v.id = vs.variable_id
-- WHERE vs.synonym_label ILIKE '%weight%'
-- ORDER BY vs.search_weight DESC, v.primary_label; 