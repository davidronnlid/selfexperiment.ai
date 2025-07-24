-- Fix data_points table by adding missing display_unit column
-- This resolves the "Could not find the 'display_unit' column" error

-- ============================================================================
-- STEP 1: Add display_unit column to data_points table
-- ============================================================================

ALTER TABLE data_points 
ADD COLUMN IF NOT EXISTS display_unit TEXT;

-- ============================================================================
-- STEP 2: Add index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_data_points_display_unit ON data_points(display_unit);

-- ============================================================================
-- STEP 3: Add comment to explain the column
-- ============================================================================

COMMENT ON COLUMN data_points.display_unit IS 'Unit used for display when the value was logged (e.g., kg, lb, °C, °F)';

-- ============================================================================
-- STEP 4: Verify the table structure
-- ============================================================================

-- Check that the column was added successfully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'data_points' 
        AND column_name = 'display_unit'
    ) THEN
        RAISE EXCEPTION 'Failed to add display_unit column to data_points table';
    ELSE
        RAISE NOTICE 'Successfully added display_unit column to data_points table';
    END IF;
END $$;
