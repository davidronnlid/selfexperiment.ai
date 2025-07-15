-- Create roadmap_comments table
CREATE TABLE roadmap_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES roadmap_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_roadmap_comments_post_id ON roadmap_comments(post_id);
CREATE INDEX idx_roadmap_comments_user_id ON roadmap_comments(user_id);
CREATE INDEX idx_roadmap_comments_created_at ON roadmap_comments(created_at);

-- Enable Row Level Security
ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmap_comments
-- Everyone can read comments
CREATE POLICY "roadmap_comments_select_policy" ON roadmap_comments
    FOR SELECT USING (true);

-- Only authenticated users can insert comments
CREATE POLICY "roadmap_comments_insert_policy" ON roadmap_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own comments
CREATE POLICY "roadmap_comments_update_policy" ON roadmap_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own comments
CREATE POLICY "roadmap_comments_delete_policy" ON roadmap_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment count function for roadmap_posts (optional optimization)
CREATE OR REPLACE FUNCTION get_comment_count(post_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM roadmap_comments 
        WHERE roadmap_comments.post_id = get_comment_count.post_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create a view that includes comment counts (optional)
CREATE OR REPLACE VIEW roadmap_posts_with_counts AS
SELECT 
    rp.*,
    COALESCE(comment_counts.comment_count, 0) as comment_count
FROM roadmap_posts rp
LEFT JOIN (
    SELECT 
        post_id,
        COUNT(*) as comment_count
    FROM roadmap_comments
    GROUP BY post_id
) comment_counts ON rp.id = comment_counts.post_id; 