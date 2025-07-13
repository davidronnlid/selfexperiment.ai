-- Add unit column to daily_logs table
-- This allows users to specify units for their logged values

ALTER TABLE daily_logs 
ADD COLUMN unit TEXT;

-- Add comment to document the purpose of the new column
COMMENT ON COLUMN daily_logs.unit IS 'Optional unit for the logged value (e.g., kg, mg, hours, etc.)';

-- Create an index on the unit column to improve query performance when filtering by unit
CREATE INDEX idx_daily_logs_unit ON daily_logs(unit) WHERE unit IS NOT NULL; 