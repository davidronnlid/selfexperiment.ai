-- Create notes_images table to store image attachments for data points
CREATE TABLE IF NOT EXISTS notes_images (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_point_id BIGINT REFERENCES data_points(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL, -- Path in Supabase storage
  image_url TEXT, -- Public URL (generated from path)
  original_filename TEXT,
  file_size BIGINT,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_images_user_id ON notes_images(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_images_data_point_id ON notes_images(data_point_id);
CREATE INDEX IF NOT EXISTS idx_notes_images_created_at ON notes_images(created_at);

-- Enable RLS
ALTER TABLE notes_images ENABLE ROW LEVEL SECURITY;

-- Users can only access their own images
DROP POLICY IF EXISTS "Users can view own notes images" ON notes_images;
CREATE POLICY "Users can view own notes images" ON notes_images
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own notes images" ON notes_images;
CREATE POLICY "Users can insert own notes images" ON notes_images
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notes images" ON notes_images;
CREATE POLICY "Users can update own notes images" ON notes_images
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own notes images" ON notes_images;
CREATE POLICY "Users can delete own notes images" ON notes_images
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Create storage bucket for notes images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notes-images', 'notes-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for notes-images bucket
DROP POLICY IF EXISTS "Users can upload own notes images" ON storage.objects;
CREATE POLICY "Users can upload own notes images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'notes-images' AND 
    ((SELECT auth.uid())::text) = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own notes images" ON storage.objects;
CREATE POLICY "Users can view own notes images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'notes-images' AND 
    ((SELECT auth.uid())::text) = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own notes images" ON storage.objects;
CREATE POLICY "Users can delete own notes images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'notes-images' AND 
    ((SELECT auth.uid())::text) = (storage.foldername(name))[1]
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_notes_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notes_images_updated_at_trigger ON notes_images;
CREATE TRIGGER update_notes_images_updated_at_trigger
  BEFORE UPDATE ON notes_images
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_images_updated_at();

COMMENT ON TABLE notes_images IS 'Stores image attachments for data point notes';
COMMENT ON COLUMN notes_images.user_id IS 'User who uploaded the image';
COMMENT ON COLUMN notes_images.data_point_id IS 'Data point this image is attached to (nullable for standalone images)';
COMMENT ON COLUMN notes_images.image_path IS 'Storage path in Supabase storage bucket';
COMMENT ON COLUMN notes_images.image_url IS 'Public URL for the image';
COMMENT ON COLUMN notes_images.original_filename IS 'Original filename when uploaded';
COMMENT ON COLUMN notes_images.file_size IS 'File size in bytes';
COMMENT ON COLUMN notes_images.content_type IS 'MIME type of the image'; 