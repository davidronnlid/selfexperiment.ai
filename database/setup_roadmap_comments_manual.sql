-- Manual setup for roadmap_comments table
-- Run this in your Supabase SQL Editor

-- Create roadmap_comments table
CREATE TABLE IF NOT EXISTS roadmap_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES roadmap_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_comments_post_id ON roadmap_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_comments_user_id ON roadmap_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_comments_created_at ON roadmap_comments(created_at);

-- Enable Row Level Security
ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "roadmap_comments_select_policy" ON roadmap_comments;
DROP POLICY IF EXISTS "roadmap_comments_insert_policy" ON roadmap_comments;
DROP POLICY IF EXISTS "roadmap_comments_update_policy" ON roadmap_comments;
DROP POLICY IF EXISTS "roadmap_comments_delete_policy" ON roadmap_comments;

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

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'roadmap_comments'
ORDER BY ordinal_position; 