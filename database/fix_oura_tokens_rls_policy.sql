-- Fix Oura Tokens RLS Policies
-- This script ensures users can manage their own Oura tokens

-- First, check if RLS is enabled on oura_tokens
-- If it is, we need to create policies to allow users to manage their own tokens

-- Enable RLS if not already enabled (this is likely already done)
ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can view their own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can insert their own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can update their own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can delete their own oura tokens" ON oura_tokens;

-- Create comprehensive RLS policies for oura_tokens
-- Policy for SELECT: Users can view their own tokens
CREATE POLICY "Users can view their own oura tokens" 
ON oura_tokens FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can insert tokens for themselves
CREATE POLICY "Users can insert their own oura tokens" 
ON oura_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own tokens
CREATE POLICY "Users can update their own oura tokens" 
ON oura_tokens FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own tokens
CREATE POLICY "Users can delete their own oura tokens" 
ON oura_tokens FOR DELETE 
USING (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON oura_tokens TO authenticated;

-- Also grant to anon in case the callback runs without full auth context
GRANT SELECT, INSERT, UPDATE, DELETE ON oura_tokens TO anon;

-- Check if the table has the right structure
-- The user_id should be a UUID that matches auth.uid()
-- Let's also ensure there's a proper index for performance
CREATE INDEX IF NOT EXISTS idx_oura_tokens_user_id ON oura_tokens(user_id);

-- Display current policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'oura_tokens';

-- Display table structure for verification
\d oura_tokens; 