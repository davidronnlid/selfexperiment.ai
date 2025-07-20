-- Enhance routine notification preferences
-- Add support for multiple notification timing options

-- First, update the notification_preferences table structure
ALTER TABLE notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_minutes_check;

-- Add new column for notification timing type
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS routine_notification_timing TEXT DEFAULT 'before';

-- Add constraint for the new timing field
ALTER TABLE notification_preferences 
ADD CONSTRAINT routine_notification_timing_check 
CHECK (routine_notification_timing IN ('before', 'at_time', 'after'));

-- Update the minutes constraint to allow negative values (for after notifications)
ALTER TABLE notification_preferences 
ADD CONSTRAINT routine_reminder_minutes_enhanced_check 
CHECK (routine_reminder_minutes >= -60 AND routine_reminder_minutes <= 60);

-- Add comment for clarity
COMMENT ON COLUMN notification_preferences.routine_reminder_minutes IS 
'Minutes relative to routine time. Positive = before, 0 = at time, negative = after';

COMMENT ON COLUMN notification_preferences.routine_notification_timing IS 
'When to send notification: before, at_time, or after the routine time';

-- Migrate existing data (all existing entries are "before" notifications)
UPDATE notification_preferences 
SET routine_notification_timing = 'before' 
WHERE routine_notification_timing IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_timing 
ON notification_preferences(routine_notification_timing);

-- Create a function to get user notification settings
CREATE OR REPLACE FUNCTION get_user_routine_notification_settings(p_user_id UUID)
RETURNS TABLE (
    timing_type TEXT,
    minutes_offset INTEGER,
    enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.routine_notification_timing,
        np.routine_reminder_minutes,
        np.routine_reminder_enabled
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Verification query
SELECT 'Enhanced routine notification preferences ready!' as status; 