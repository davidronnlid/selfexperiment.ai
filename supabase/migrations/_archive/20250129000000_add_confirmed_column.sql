-- Add confirmed column to data_points table
-- This allows users to confirm auto-tracked data points

-- Add the confirmed column with default TRUE for existing data
ALTER TABLE data_points 
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT TRUE;

-- Set confirmed = FALSE for auto-tracked data points (source contains 'auto' or 'routine')
UPDATE data_points 
SET confirmed = FALSE 
WHERE source && ARRAY['auto'::text] OR source && ARRAY['routine'::text];

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_data_points_confirmed ON data_points(confirmed);
CREATE INDEX IF NOT EXISTS idx_data_points_user_confirmed ON data_points(user_id, confirmed);
CREATE INDEX IF NOT EXISTS idx_data_points_user_confirmed_created ON data_points(user_id, confirmed, created_at DESC);

-- Create a trigger to set the default confirmed value for new inserts
CREATE OR REPLACE FUNCTION set_data_points_confirmed_default()
RETURNS TRIGGER AS $$
BEGIN
  -- If confirmed is not explicitly set, determine the default value
  IF NEW.confirmed IS NULL THEN
    -- Default to FALSE for auto/routine sources, TRUE for everything else
    IF NEW.source && ARRAY['auto'::text] OR NEW.source && ARRAY['routine'::text] THEN
      NEW.confirmed := FALSE;
    ELSE
      NEW.confirmed := TRUE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new inserts
DROP TRIGGER IF EXISTS trigger_set_data_points_confirmed_default ON data_points;
CREATE TRIGGER trigger_set_data_points_confirmed_default
  BEFORE INSERT ON data_points
  FOR EACH ROW
  EXECUTE FUNCTION set_data_points_confirmed_default();
