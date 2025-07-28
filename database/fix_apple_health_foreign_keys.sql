-- ============================================================================
-- FIX APPLE HEALTH FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- This script fixes the foreign key relationship issues between 
-- apple_health_variable_data_points and variables tables

-- ============================================================================
-- STEP 1: Create missing Apple Health variables
-- ============================================================================

-- Insert Apple Health variables if they don't exist
INSERT INTO variables (slug, label, icon, category, unit, constraints, is_active, is_public, source, display_order)
VALUES 
    ('ah_steps', 'Steps (Apple Health)', '👣', 'Activity', 'steps', '{"min": 0, "max": 50000}', true, true, 'apple_health', 1),
    ('ah_heart_rate', 'Heart Rate (Apple Health)', '❤️', 'Vitals', 'bpm', '{"min": 30, "max": 220}', true, true, 'apple_health', 2),
    ('ah_weight', 'Weight (Apple Health)', '⚖️', 'Body', 'kg', '{"min": 30, "max": 300}', true, true, 'apple_health', 3),
    ('ah_sleep_duration', 'Sleep Duration (Apple Health)', '😴', 'Sleep', 'hours', '{"min": 0, "max": 24}', true, true, 'apple_health', 4),
    ('ah_active_calories', 'Active Calories (Apple Health)', '🔥', 'Activity', 'kcal', '{"min": 0, "max": 5000}', true, true, 'apple_health', 5),
    ('ah_resting_heart_rate', 'Resting Heart Rate (Apple Health)', '💓', 'Vitals', 'bpm', '{"min": 30, "max": 150}', true, true, 'apple_health', 6),
    ('ah_blood_pressure_systolic', 'Blood Pressure Systolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 70, "max": 200}', true, true, 'apple_health', 7),
    ('ah_blood_pressure_diastolic', 'Blood Pressure Diastolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 40, "max": 130}', true, true, 'apple_health', 8),
    ('ah_body_fat_percentage', 'Body Fat Percentage (Apple Health)', '📊', 'Body', '%', '{"min": 5, "max": 50}', true, true, 'apple_health', 9),
    ('ah_vo2_max', 'VO2 Max (Apple Health)', '🫁', 'Fitness', 'ml/kg/min', '{"min": 20, "max": 80}', true, true, 'apple_health', 10)
ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    constraints = EXCLUDED.constraints,
    is_active = EXCLUDED.is_active,
    is_public = EXCLUDED.is_public,
    source = EXCLUDED.source,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- STEP 2: Create mapping table for old variable_id values to new UUIDs
-- ============================================================================

-- Create a temporary mapping from old string values to new variable UUIDs
CREATE TEMP TABLE variable_mapping AS
SELECT 
    old_value,
    new_uuid
FROM (
    VALUES 
        ('steps', (SELECT id FROM variables WHERE slug = 'ah_steps')),
        ('heart_rate', (SELECT id FROM variables WHERE slug = 'ah_heart_rate')),
        ('weight', (SELECT id FROM variables WHERE slug = 'ah_weight')),
        ('sleep_duration', (SELECT id FROM variables WHERE slug = 'ah_sleep_duration')),
        ('active_calories', (SELECT id FROM variables WHERE slug = 'ah_active_calories')),
        ('resting_heart_rate', (SELECT id FROM variables WHERE slug = 'ah_resting_heart_rate')),
        ('blood_pressure_systolic', (SELECT id FROM variables WHERE slug = 'ah_blood_pressure_systolic')),
        ('blood_pressure_diastolic', (SELECT id FROM variables WHERE slug = 'ah_blood_pressure_diastolic')),
        ('body_fat_percentage', (SELECT id FROM variables WHERE slug = 'ah_body_fat_percentage')),
        ('vo2_max', (SELECT id FROM variables WHERE slug = 'ah_vo2_max'))
) AS mapping(old_value, new_uuid);

-- ============================================================================
-- STEP 3: Add new variable_id_uuid column
-- ============================================================================

-- Add new UUID column for proper foreign key relationship
ALTER TABLE apple_health_variable_data_points 
ADD COLUMN IF NOT EXISTS variable_id_uuid UUID;

-- ============================================================================
-- STEP 4: Migrate existing data to use UUIDs
-- ============================================================================

-- Update the new column with proper UUIDs based on mapping
UPDATE apple_health_variable_data_points 
SET variable_id_uuid = mapping.new_uuid
FROM variable_mapping mapping
WHERE apple_health_variable_data_points.variable_id = mapping.old_value;

-- For any unmapped values, try to find a matching variable by slug
UPDATE apple_health_variable_data_points 
SET variable_id_uuid = v.id
FROM variables v
WHERE apple_health_variable_data_points.variable_id_uuid IS NULL
AND (v.slug = 'ah_' || apple_health_variable_data_points.variable_id 
     OR v.slug = apple_health_variable_data_points.variable_id);

-- ============================================================================
-- STEP 5: Handle any remaining unmapped data
-- ============================================================================

-- Log unmapped records
DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count 
    FROM apple_health_variable_data_points 
    WHERE variable_id_uuid IS NULL;
    
    IF unmapped_count > 0 THEN
        RAISE NOTICE 'Found % unmapped apple health records', unmapped_count;
        
        -- Show unmapped variable_id values
        RAISE NOTICE 'Unmapped variable_id values: %', (
            SELECT STRING_AGG(DISTINCT variable_id, ', ')
            FROM apple_health_variable_data_points 
            WHERE variable_id_uuid IS NULL
        );
    ELSE
        RAISE NOTICE 'All apple health records successfully mapped to variables';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Add foreign key constraint
-- ============================================================================

-- Add the foreign key constraint to the new UUID column
ALTER TABLE apple_health_variable_data_points 
ADD CONSTRAINT apple_health_variable_data_points_variable_id_uuid_fkey 
FOREIGN KEY (variable_id_uuid) REFERENCES variables(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 7: Create index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_variable_id_uuid 
ON apple_health_variable_data_points(variable_id_uuid);

-- ============================================================================
-- STEP 8: Update RLS policies to work with new column
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own apple health data points" ON apple_health_variable_data_points;
DROP POLICY IF EXISTS "Users can insert own apple health data points" ON apple_health_variable_data_points;
DROP POLICY IF EXISTS "Users can update own apple health data points" ON apple_health_variable_data_points;
DROP POLICY IF EXISTS "Users can delete own apple health data points" ON apple_health_variable_data_points;

-- Recreate policies
CREATE POLICY "Users can view own apple health data points" ON apple_health_variable_data_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own apple health data points" ON apple_health_variable_data_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own apple health data points" ON apple_health_variable_data_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own apple health data points" ON apple_health_variable_data_points
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 9: Verification queries
-- ============================================================================

-- Verify the fix works
DO $$
BEGIN
    RAISE NOTICE 'Verification: Checking if foreign key relationship now works...';
    
    -- This should now work without errors
    PERFORM 1 FROM apple_health_variable_data_points ah
    JOIN variables v ON ah.variable_id_uuid = v.id
    LIMIT 1;
    
    RAISE NOTICE '✅ Foreign key relationship verified successfully';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Foreign key relationship still has issues: %', SQLERRM;
END $$;

-- Show summary of migrated data
SELECT 
    v.slug,
    v.label,
    COUNT(*) as data_points,
    MIN(ah.date) as earliest_date,
    MAX(ah.date) as latest_date
FROM apple_health_variable_data_points ah
JOIN variables v ON ah.variable_id_uuid = v.id
GROUP BY v.slug, v.label
ORDER BY v.slug; 