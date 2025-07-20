-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE SETUP
-- ============================================================================
-- This creates the missing notification_preferences table and relationships

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id UUID, -- References routines table if it exists
    notification_time TIME NOT NULL DEFAULT '08:00:00',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    notification_type TEXT NOT NULL DEFAULT 'push' CHECK (notification_type IN ('push', 'email', 'sms')),
    custom_message TEXT,
    days_of_week INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,0], -- Sunday=0, Monday=1, etc.
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id UUID,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
    delivery_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences" 
ON notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" 
ON notification_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON notification_preferences FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" 
ON notification_preferences FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for notification_history
CREATE POLICY "Users can view their own notification history" 
ON notification_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notification history" 
ON notification_history FOR INSERT 
WITH CHECK (true); -- Service role bypass

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled ON notification_preferences(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_notification_preferences_time ON notification_preferences(notification_time);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);

-- Create updated_at trigger for notification_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample notification preferences for testing (optional)
-- Uncomment these lines if you want test data
/*
INSERT INTO notification_preferences (user_id, notification_time, custom_message, days_of_week)
SELECT 
    auth.uid(),
    '08:00:00',
    'Good morning! Time for your routine.',
    ARRAY[1,2,3,4,5] -- Monday to Friday
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
*/

-- Check if the tables were created successfully
SELECT 
    tablename,
    schemaname,
    tableowner
FROM pg_tables 
WHERE tablename IN ('notification_preferences', 'notification_history')
ORDER BY tablename;

-- Check if the profiles table exists (needed for the Edge Function join)
SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
) as profiles_table_exists;

SELECT '✅ Notification preferences schema setup completed!' as result; 