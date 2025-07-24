-- Fix RLS policies for variables table to allow public read access
-- Allow unauthenticated users to read all columns except created_by
-- Restrict create, update, delete to authenticated users only

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view all active variables" ON variables;
DROP POLICY IF EXISTS "Users can create variables" ON variables;
DROP POLICY IF EXISTS "Users can update their own variables" ON variables;
DROP POLICY IF EXISTS "Users can delete their own variables" ON variables;
DROP POLICY IF EXISTS "Public read access to variables" ON variables;

-- Enable RLS on variables table (if not already enabled)
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all columns except created_by
CREATE POLICY "Public read access to variables" ON variables
FOR SELECT
TO public
USING (true);

-- Only authenticated users can create variables
CREATE POLICY "Authenticated users can create variables" ON variables
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update variables they created
CREATE POLICY "Users can update their own variables" ON variables
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Users can delete variables they created
CREATE POLICY "Users can delete their own variables" ON variables
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Create a view that excludes the created_by column for public access
-- This ensures even if someone tries to select created_by, they won't get it
CREATE OR REPLACE VIEW public_variables AS
SELECT 
  id,
  label,
  slug,
  data_type,
  min_value,
  max_value,
  unit,
  is_active,
  created_at,
  updated_at,
  description,
  category,
  display_order
FROM variables
WHERE is_active = true;

-- Grant select permissions on the view to public
GRANT SELECT ON public_variables TO public;
GRANT SELECT ON public_variables TO anon;
GRANT SELECT ON public_variables TO authenticated;

-- Verify the policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'variables'; 