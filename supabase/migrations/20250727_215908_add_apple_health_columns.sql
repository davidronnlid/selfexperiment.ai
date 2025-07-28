-- Add commonly used Apple Health fields as proper columns
-- This improves query performance and makes the data more structured

-- Add new columns to apple_health_variable_data_points table
ALTER TABLE apple_health_variable_data_points 
ADD COLUMN IF NOT EXISTS unit text,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'apple_health',
ADD COLUMN IF NOT EXISTS data_type text,
ADD COLUMN IF NOT EXISTS is_daily_total boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS start_date timestamptz,
ADD COLUMN IF NOT EXISTS end_date timestamptz;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_apple_health_data_points_source ON apple_health_variable_data_points(source);
CREATE INDEX IF NOT EXISTS idx_apple_health_data_points_data_type ON apple_health_variable_data_points(data_type);
CREATE INDEX IF NOT EXISTS idx_apple_health_data_points_is_daily_total ON apple_health_variable_data_points(is_daily_total);
CREATE INDEX IF NOT EXISTS idx_apple_health_data_points_date_source ON apple_health_variable_data_points(date, source);

-- Update existing records to populate new columns from raw data
UPDATE apple_health_variable_data_points 
SET 
    unit = COALESCE((raw->>'unit')::text, 'count'),
    source = COALESCE((raw->>'source')::text, 'apple_health'),
    data_type = COALESCE((raw->>'data_type')::text, variable_id),
    is_daily_total = COALESCE((raw->>'is_daily_total')::boolean, false),
    start_date = CASE 
        WHEN raw->>'start_date' IS NOT NULL AND raw->>'start_date' != 'null' 
        THEN (raw->>'start_date')::timestamptz 
        ELSE NULL 
    END,
    end_date = CASE 
        WHEN raw->>'end_date' IS NOT NULL AND raw->>'end_date' != 'null' 
        THEN (raw->>'end_date')::timestamptz 
        ELSE NULL 
    END
WHERE unit IS NULL OR source IS NULL OR data_type IS NULL OR is_daily_total IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN apple_health_variable_data_points.unit IS 'Unit of measurement (e.g., count, kg, etc.)';
COMMENT ON COLUMN apple_health_variable_data_points.source IS 'Data source (apple_health, manual, etc.)';
COMMENT ON COLUMN apple_health_variable_data_points.data_type IS 'Type of health data (steps, weight, etc.)';
COMMENT ON COLUMN apple_health_variable_data_points.is_daily_total IS 'Whether this represents a daily total aggregation';
COMMENT ON COLUMN apple_health_variable_data_points.start_date IS 'Start timestamp for the measurement period';
COMMENT ON COLUMN apple_health_variable_data_points.end_date IS 'End timestamp for the measurement period'; 