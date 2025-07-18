-- ============================================================================
-- NOTIFICATION PREFERENCES SCHEMA (Simplified)
-- ============================================================================

-- Create notification preferences table with essential fields only
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Routine reminder settings
    routine_reminder_enabled BOOLEAN DEFAULT true,
    routine_reminder_minutes INTEGER DEFAULT 15 CHECK (routine_reminder_minutes >= 1 AND routine_reminder_minutes <= 1440),
    
    -- Test notification settings
    test_notification_enabled BOOLEAN DEFAULT false,
    test_notification_time TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- ============================================================================
-- NOTIFICATION HISTORY TABLE
-- ============================================================================

-- Track sent notifications for analytics and preventing duplicates
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'routine_reminder', 
        'data_sync', 
        'weekly_insights', 
        'experiment_reminder', 
        'goal_celebration',
        'test_notification',
        'system_notification'
    )),
    title TEXT NOT NULL,
    body TEXT,
    
    -- Delivery status
    delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'clicked', 'dismissed')),
    error_message TEXT,
    
    -- Additional context
    context JSONB,
    
    -- Metadata
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance indexes
    CONSTRAINT notification_history_type_check CHECK (notification_type IN (
        'routine_reminder', 
        'data_sync', 
        'weekly_insights', 
        'experiment_reminder', 
        'goal_celebration',
        'test_notification',
        'system_notification'
    ))
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Notification history policies
CREATE POLICY "Users can view own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification history" ON notification_history
    FOR INSERT WITH CHECK (true); -- Allow system to insert

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update the updated_at timestamp on any change
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Function to log notification history
CREATE OR REPLACE FUNCTION log_notification_history(
    p_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO notification_history (
        user_id,
        notification_type,
        title,
        body,
        context
    ) VALUES (
        p_user_id,
        p_notification_type,
        p_title,
        p_body,
        p_context
    ) RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at 
ON notification_preferences(updated_at);

-- Notification history indexes
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id 
ON notification_history(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_history_type 
ON notification_history(notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at 
ON notification_history(sent_at);

CREATE INDEX IF NOT EXISTS idx_notification_history_status 
ON notification_history(delivery_status);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
    routine_reminder_enabled BOOLEAN,
    routine_reminder_minutes INTEGER,
    data_sync_notifications_enabled BOOLEAN,
    weekly_insights_enabled BOOLEAN,
    weekly_insights_day TEXT,
    weekly_insights_time TIME,
    experiment_reminders_enabled BOOLEAN,
    goal_celebrations_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.routine_reminder_enabled,
        np.routine_reminder_minutes,
        np.data_sync_notifications_enabled,
        np.weekly_insights_enabled,
        np.weekly_insights_day,
        np.weekly_insights_time,
        np.experiment_reminders_enabled,
        np.goal_celebrations_enabled
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user should receive notifications during quiet hours
CREATE OR REPLACE FUNCTION should_send_notification_during_quiet_hours(
    p_user_id UUID,
    p_notification_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_quiet_hours_enabled BOOLEAN;
    v_quiet_hours_start TIME;
    v_quiet_hours_end TIME;
    v_current_time TIME;
BEGIN
    SELECT 
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
    INTO v_quiet_hours_enabled, v_quiet_hours_start, v_quiet_hours_end
    FROM notification_preferences
    WHERE user_id = p_user_id;
    
    -- If quiet hours not enabled, always send
    IF NOT v_quiet_hours_enabled THEN
        RETURN true;
    END IF;
    
    v_current_time := p_notification_time::time;
    
    -- Check if current time is within quiet hours
    IF v_quiet_hours_start < v_quiet_hours_end THEN
        -- Same day range (e.g., 22:00 to 08:00)
        RETURN v_current_time < v_quiet_hours_start OR v_current_time > v_quiet_hours_end;
    ELSE
        -- Overnight range (e.g., 22:00 to 08:00)
        RETURN v_current_time > v_quiet_hours_end AND v_current_time < v_quiet_hours_start;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DEFAULT DATA (Optional)
-- ============================================================================

-- Insert default preferences for existing users (run manually if needed)
-- INSERT INTO notification_preferences (user_id)
-- SELECT id FROM auth.users
-- WHERE id NOT IN (SELECT user_id FROM notification_preferences);

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old notification history
CREATE OR REPLACE FUNCTION cleanup_old_notification_history(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM notification_history 
    WHERE sent_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- View for notification analytics
CREATE OR REPLACE VIEW notification_analytics AS
SELECT 
    user_id,
    notification_type,
    delivery_status,
    COUNT(*) as notification_count,
    MIN(sent_at) as first_sent,
    MAX(sent_at) as last_sent
FROM notification_history
GROUP BY user_id, notification_type, delivery_status;

-- View for user notification preferences summary
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT 
    user_id,
    routine_reminder_enabled,
    data_sync_notifications_enabled,
    weekly_insights_enabled,
    experiment_reminders_enabled,
    goal_celebrations_enabled,
    notification_sound_enabled,
    quiet_hours_enabled,
    updated_at
FROM notification_preferences; 