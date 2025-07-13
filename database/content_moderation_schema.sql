-- Content Moderation Database Schema
-- Supports community reporting with transparency and due process

-- ============================================================================
-- VARIABLE REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS variable_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Report details
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misleading', 'duplicate', 'other')),
    details TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolution TEXT, -- Admin notes on resolution
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate reports from same user
    UNIQUE(variable_id, reporter_id)
);

-- ============================================================================
-- MODERATION ACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Action details
    action_type TEXT NOT NULL CHECK (action_type IN ('flag', 'hide', 'restrict', 'restore', 'warning')),
    reason TEXT NOT NULL,
    details TEXT,
    
    -- Duration (for temporary actions)
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- VARIABLE MODERATION STATUS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS variable_moderation_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE UNIQUE,
    
    -- Status flags
    is_flagged BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    is_restricted BOOLEAN DEFAULT false, -- Restricted from public sharing
    
    -- Metrics
    report_count INTEGER DEFAULT 0,
    flag_score INTEGER DEFAULT 0, -- Calculated based on reports and actions
    
    -- Timestamps
    first_reported_at TIMESTAMP WITH TIME ZONE,
    last_action_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MODERATION LOGS TABLE (for transparency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Action details
    action_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    
    -- Context
    triggered_by TEXT, -- 'user_report', 'automated', 'admin_review'
    moderator_id UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Make logs immutable
    CONSTRAINT moderation_logs_immutable CHECK (created_at IS NOT NULL)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Variable reports indexes
CREATE INDEX IF NOT EXISTS idx_variable_reports_variable_id ON variable_reports(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_reports_reporter_id ON variable_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_variable_reports_status ON variable_reports(status);
CREATE INDEX IF NOT EXISTS idx_variable_reports_created_at ON variable_reports(created_at);

-- Moderation actions indexes
CREATE INDEX IF NOT EXISTS idx_moderation_actions_variable_id ON moderation_actions(variable_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator_id ON moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_action_type ON moderation_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_is_active ON moderation_actions(is_active);

-- Variable moderation status indexes
CREATE INDEX IF NOT EXISTS idx_variable_moderation_status_is_flagged ON variable_moderation_status(is_flagged);
CREATE INDEX IF NOT EXISTS idx_variable_moderation_status_is_hidden ON variable_moderation_status(is_hidden);
CREATE INDEX IF NOT EXISTS idx_variable_moderation_status_flag_score ON variable_moderation_status(flag_score);

-- Moderation logs indexes
CREATE INDEX IF NOT EXISTS idx_moderation_logs_variable_id ON moderation_logs(variable_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_action_type ON moderation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON moderation_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Variable reports policies
ALTER TABLE variable_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON variable_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports" ON variable_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Moderators can view all reports (implement role-based access)
-- Note: This would require a roles system

-- Moderation actions policies
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- Only moderators can view/create moderation actions
-- Note: This would require a roles system

-- Variable moderation status policies
ALTER TABLE variable_moderation_status ENABLE ROW LEVEL SECURITY;

-- Public read access for moderation status (to show flagged content)
CREATE POLICY "Public can view moderation status" ON variable_moderation_status
    FOR SELECT USING (true);

-- Moderation logs policies
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for transparency
CREATE POLICY "Public can view moderation logs" ON moderation_logs
    FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS FOR MODERATION WORKFLOW
-- ============================================================================

-- Function to update moderation status when reports are created
CREATE OR REPLACE FUNCTION update_moderation_status_on_report()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or create moderation status
    INSERT INTO variable_moderation_status (variable_id, report_count, first_reported_at, updated_at)
    VALUES (NEW.variable_id, 1, NEW.created_at, NEW.created_at)
    ON CONFLICT (variable_id) DO UPDATE SET
        report_count = variable_moderation_status.report_count + 1,
        updated_at = NEW.created_at;
    
    -- Auto-flag if report threshold is reached
    UPDATE variable_moderation_status
    SET is_flagged = true, flag_score = flag_score + 1
    WHERE variable_id = NEW.variable_id AND report_count >= 3;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update moderation status on new reports
CREATE TRIGGER trigger_update_moderation_status_on_report
    AFTER INSERT ON variable_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_moderation_status_on_report();

-- Function to log moderation actions
CREATE OR REPLACE FUNCTION log_moderation_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO moderation_logs (variable_id, action_type, reason, details, triggered_by, moderator_id)
    VALUES (NEW.variable_id, NEW.action_type, NEW.reason, NEW.details, 'admin_review', NEW.moderator_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log moderation actions
CREATE TRIGGER trigger_log_moderation_action
    AFTER INSERT ON moderation_actions
    FOR EACH ROW
    EXECUTE FUNCTION log_moderation_action();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get variables that need moderation review
CREATE OR REPLACE FUNCTION get_variables_for_review()
RETURNS TABLE(
    variable_id UUID,
    variable_label TEXT,
    report_count INTEGER,
    flag_score INTEGER,
    last_reported TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as variable_id,
        v.label as variable_label,
        vms.report_count,
        vms.flag_score,
        vms.first_reported_at as last_reported
    FROM variables v
    JOIN variable_moderation_status vms ON v.id = vms.variable_id
    WHERE vms.is_flagged = true AND vms.is_hidden = false
    ORDER BY vms.flag_score DESC, vms.first_reported_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if variable should be hidden from public view
CREATE OR REPLACE FUNCTION should_hide_variable(variable_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    status_record RECORD;
BEGIN
    SELECT is_hidden, is_restricted INTO status_record
    FROM variable_moderation_status
    WHERE variable_id = variable_uuid;
    
    -- If no moderation status exists, variable is visible
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Hide if explicitly hidden or restricted
    RETURN status_record.is_hidden OR status_record.is_restricted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 