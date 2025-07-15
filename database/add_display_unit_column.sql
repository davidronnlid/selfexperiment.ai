-- Add display_unit column to user_variable_preferences table
-- This column stores the user's preferred display unit for each variable

ALTER TABLE user_variable_preferences 
ADD COLUMN IF NOT EXISTS display_unit TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_display_unit ON user_variable_preferences(display_unit);

-- Add comment to explain the column
COMMENT ON COLUMN user_variable_preferences.display_unit IS 'User preferred display unit for the variable (e.g., kg, lb, celsius, fahrenheit)'; 