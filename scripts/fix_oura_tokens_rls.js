console.log(`
🔧 Oura Tokens RLS Fix Required

The issue is that Row Level Security (RLS) is blocking access to oura_tokens.

Run this SQL in your Supabase SQL Editor:

-- Check if RLS is enabled on oura_tokens
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'oura_tokens';

-- Add RLS policies for oura_tokens
CREATE POLICY "Users can view their own oura tokens" ON oura_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own oura tokens" ON oura_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own oura tokens" ON oura_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS if not already enabled
ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;

✅ After running this SQL, the Oura API should be able to access tokens properly!

Alternative: If you prefer, I can update the API to use the service role key instead.
`);
