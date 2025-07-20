-- ============================================================================
-- FIX MISSING PUSH_SUBSCRIPTIONS TABLE
-- ============================================================================
-- This script creates the missing push_subscriptions table that's causing the 
-- error: relation "public.push_subscriptions" does not exist

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    platform TEXT,
    browser TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one subscription per endpoint per user
    UNIQUE(user_id, endpoint)
);

-- Create notification_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id UUID,
    notification_type TEXT NOT NULL DEFAULT 'push',
    title TEXT NOT NULL,
    body TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
    delivery_details JSONB,
    push_subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    delivery_method TEXT DEFAULT 'browser_api' CHECK (delivery_method IN ('browser_api', 'web_push')),
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for push_subscriptions
CREATE POLICY "Users can view their own push subscriptions" 
ON push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions" 
ON push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" 
ON push_subscriptions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" 
ON push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- Service role can access all subscriptions (for sending notifications)
CREATE POLICY "Service role can access all push subscriptions" 
ON push_subscriptions FOR ALL 
TO service_role
USING (true);

-- Create RLS policies for notification_history
CREATE POLICY "Users can view their own notification history" 
ON notification_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notification history" 
ON notification_history FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can manage all notification history" 
ON notification_history FOR ALL 
TO service_role
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_push_subscription ON notification_history(push_subscription_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at 
    BEFORE UPDATE ON push_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT 
    'push_subscriptions' as table_name,
    COUNT(*) as row_count
FROM push_subscriptions
UNION ALL
SELECT 
    'notification_history' as table_name,
    COUNT(*) as row_count
FROM notification_history;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('push_subscriptions', 'notification_history')
ORDER BY tablename, policyname;

SELECT '✅ Push subscriptions and notification history tables created successfully!' as result; 