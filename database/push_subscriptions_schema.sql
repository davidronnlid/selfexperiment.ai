-- ============================================================================
-- PUSH SUBSCRIPTIONS SCHEMA
-- ============================================================================
-- This schema stores push notification subscriptions for server-side notifications
-- Required for iOS PWA background notifications

-- Push Subscriptions Table
-- Stores the subscription data needed to send push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Push subscription data (from browser's pushManager.subscribe())
    endpoint TEXT NOT NULL, -- The push service URL
    p256dh_key TEXT NOT NULL, -- Public key for encryption
    auth_key TEXT NOT NULL, -- Authentication secret
    
    -- Device/Browser info
    user_agent TEXT, -- Browser user agent
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    platform TEXT, -- iOS, Android, Windows, macOS, etc.
    browser TEXT, -- Chrome, Safari, Firefox, etc.
    
    -- Subscription metadata
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, endpoint), -- One subscription per user per device
    CONSTRAINT push_subscriptions_endpoint_check CHECK (endpoint LIKE 'https://%')
);

-- Update the notification_history table to track push delivery
ALTER TABLE notification_history 
ADD COLUMN IF NOT EXISTS push_subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'browser_api' CHECK (delivery_method IN ('browser_api', 'web_push'));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used ON push_subscriptions(last_used_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_push_subscription ON notification_history(push_subscription_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can access all subscriptions for sending notifications
CREATE POLICY "Service role can manage all push subscriptions" ON push_subscriptions
    FOR ALL TO service_role USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_subscriptions_updated_at_trigger
    BEFORE UPDATE ON push_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get active push subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(target_user_id UUID)
RETURNS TABLE(
    id UUID,
    endpoint TEXT,
    p256dh_key TEXT,
    auth_key TEXT,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.endpoint,
        ps.p256dh_key,
        ps.auth_key,
        ps.device_type,
        ps.created_at
    FROM push_subscriptions ps
    WHERE ps.user_id = target_user_id 
      AND ps.is_active = true
    ORDER BY ps.last_used_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old/inactive subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete subscriptions that haven't been used in 90 days
    DELETE FROM push_subscriptions 
    WHERE last_used_at < (NOW() - INTERVAL '90 days')
      AND is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA AND VERIFICATION
-- ============================================================================

-- Verification query
SELECT 'Push subscriptions table created successfully!' as result;

-- Show table structure
\d push_subscriptions; 