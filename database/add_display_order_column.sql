-- Add missing display_order column to user_variable_preferences table
-- This column is needed for the VariableCreationDialog to work properly

ALTER TABLE user_variable_preferences 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_display_order 
ON user_variable_preferences(display_order);

-- Update any existing records to have a default display_order
UPDATE user_variable_preferences 
SET display_order = 0 
WHERE display_order IS NULL; 