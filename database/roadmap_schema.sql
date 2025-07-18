-- Public Roadmap Database Schema
-- Supports collaborative roadmap where users can create, edit, and like feature requests

-- ============================================================================
-- ROADMAP POSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS roadmap_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Post content
    title TEXT NOT NULL,
    description TEXT,
    tag TEXT NOT NULL CHECK (tag IN ('Analytics', 'Manual Tracking', 'Auto-Tracking', 'Community')),
    
    -- Authorship
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Status
    status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'in_progress', 'completed', 'rejected')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT roadmap_posts_title_check CHECK (title IS NOT NULL AND LENGTH(TRIM(title)) > 0)
);

-- ============================================================================
-- ROADMAP LIKES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS roadmap_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES roadmap_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(post_id, user_id) -- One like per user per post
);

-- ============================================================================
-- ROADMAP EDIT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS roadmap_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES roadmap_posts(id) ON DELETE CASCADE,
    edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Change tracking
    field_changed TEXT NOT NULL, -- 'title', 'description', 'tag', 'status', 'priority'
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT, -- Optional reason for the change
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Roadmap posts indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_posts_tag ON roadmap_posts(tag);
CREATE INDEX IF NOT EXISTS idx_roadmap_posts_status ON roadmap_posts(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_posts_priority ON roadmap_posts(priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_posts_created_by ON roadmap_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_roadmap_posts_created_at ON roadmap_posts(created_at);

-- Roadmap likes indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_likes_post_id ON roadmap_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_likes_user_id ON roadmap_likes(user_id);

-- Roadmap edit history indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_edit_history_post_id ON roadmap_edit_history(post_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_edit_history_edited_by ON roadmap_edit_history(edited_by);
CREATE INDEX IF NOT EXISTS idx_roadmap_edit_history_created_at ON roadmap_edit_history(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Roadmap posts policies
ALTER TABLE roadmap_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view roadmap posts
CREATE POLICY "Anyone can view roadmap posts" ON roadmap_posts
    FOR SELECT USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create roadmap posts" ON roadmap_posts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Any authenticated user can edit any post (collaborative editing)
CREATE POLICY "Authenticated users can edit roadmap posts" ON roadmap_posts
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Roadmap likes policies
ALTER TABLE roadmap_likes ENABLE ROW LEVEL SECURITY;

-- Everyone can view likes
CREATE POLICY "Anyone can view roadmap likes" ON roadmap_likes
    FOR SELECT USING (true);

-- Users can only create/delete their own likes
CREATE POLICY "Users can manage own roadmap likes" ON roadmap_likes
    FOR ALL USING (auth.uid() = user_id);

-- Roadmap edit history policies
ALTER TABLE roadmap_edit_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view edit history for transparency
CREATE POLICY "Anyone can view roadmap edit history" ON roadmap_edit_history
    FOR SELECT USING (true);

-- Only the system can insert edit history records
CREATE POLICY "System can insert roadmap edit history" ON roadmap_edit_history
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- FUNCTIONS FOR ROADMAP WORKFLOW
-- ============================================================================

-- Function to automatically track edits
CREATE OR REPLACE FUNCTION track_roadmap_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Track title changes
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'title', OLD.title, NEW.title);
    END IF;
    
    -- Track description changes
    IF OLD.description IS DISTINCT FROM NEW.description THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'description', OLD.description, NEW.description);
    END IF;
    
    -- Track tag changes
    IF OLD.tag IS DISTINCT FROM NEW.tag THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'tag', OLD.tag, NEW.tag);
    END IF;
    
    -- Track status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
    END IF;
    
    -- Track priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO roadmap_edit_history (post_id, edited_by, field_changed, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'priority', OLD.priority, NEW.priority);
    END IF;
    
    -- Update the last_edited_by and updated_at fields
    NEW.last_edited_by = auth.uid();
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic edit tracking
CREATE TRIGGER trigger_track_roadmap_edit
    BEFORE UPDATE ON roadmap_posts
    FOR EACH ROW
    EXECUTE FUNCTION track_roadmap_edit(); 