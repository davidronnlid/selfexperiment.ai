-- Roadmap tables Row Level Security policies

-- Posts
ALTER TABLE roadmap_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read posts
CREATE POLICY "public_read_roadmap_posts" ON roadmap_posts
  FOR SELECT USING (true);

-- Only owner may insert/update/delete their own posts
CREATE POLICY "owner_manage_roadmap_posts" ON roadmap_posts
  FOR ALL USING (auth.uid() = created_by);

-- Likes
ALTER TABLE roadmap_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_roadmap_likes" ON roadmap_likes
  FOR SELECT USING (true);
CREATE POLICY "owner_manage_roadmap_likes" ON roadmap_likes
  FOR INSERT, DELETE USING (auth.uid() = user_id);

-- Comments
ALTER TABLE roadmap_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_roadmap_comments" ON roadmap_comments
  FOR SELECT USING (true);
CREATE POLICY "owner_manage_roadmap_comments" ON roadmap_comments
  FOR INSERT, UPDATE, DELETE USING (auth.uid() = user_id);