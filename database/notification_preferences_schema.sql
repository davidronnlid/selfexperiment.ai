-- ============================================================================
-- NOTIFICATION PREFERENCES SCHEMA
-- ============================================================================

-- Table to store user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Main notification toggle
    enabled BOOLEAN DEFAULT false,
    
    -- Routine reminders
    routine_reminders BOOLEAN DEFAULT true,
    routine_reminder_time TEXT DEFAULT '15', -- Minutes before routine
    
    -- Data sync notifications
    data_sync_notifications BOOLEAN DEFAULT true,
    
    -- Weekly insights
    weekly_insights BOOLEAN DEFAULT true,
    weekly_insights_day INTEGER DEFAULT 1, -- 0-6 (Sunday-Saturday)
    weekly_insights_time TEXT DEFAULT '09:00', -- HH:MM format
    
    -- Experiment reminders
    experiment_reminders BOOLEAN DEFAULT true,
    
    -- Goal celebrations
    goal_celebrations BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id), -- One preference set per user
    CONSTRAINT notification_preferences_day_check CHECK (weekly_insights_day >= 0 AND weekly_insights_day <= 6)
);

-- ============================================================================
-- NOTIFICATION HISTORY TABLE
-- ============================================================================

-- Table to track sent notifications (for analytics and preventing duplicates)
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL, -- 'routine_reminder', 'data_sync', 'weekly_insights', etc.
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Metadata
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional context
    context JSONB, -- Related routine_id, experiment_id, etc.
    
    -- Delivery status
    delivery_status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'clicked'
    error_message TEXT,
    
    -- Performance indexes
    CONSTRAINT notification_history_type_check CHECK (notification_type IN (
        'routine_reminder', 
        'data_sync', 
        'weekly_insights', 
        'experiment_reminder', 
        'goal_celebration',
        'test'
    ))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Notification history indexes
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Notification history policies
CREATE POLICY "Users can view their own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification history" ON notification_history
    FOR INSERT WITH CHECK (true); -- Allow system to insert

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at_trigger
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to add sample data for testing
/*
INSERT INTO notification_preferences (user_id, enabled, routine_reminders, weekly_insights) VALUES
('your-user-id-here', true, true, true);
*/ 