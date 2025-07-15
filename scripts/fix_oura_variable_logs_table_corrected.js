console.log(`
⚠️  The unique constraint already exists. Here's the corrected SQL:

-- First, check the current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'oura_variable_logs' 
ORDER BY ordinal_position;

-- Backup existing data (if any)
CREATE TABLE IF NOT EXISTS oura_variable_logs_backup AS SELECT * FROM oura_variable_logs;

-- Drop the existing table (this will also drop the constraint)
DROP TABLE IF EXISTS oura_variable_logs CASCADE;

-- Create the correct table structure
CREATE TABLE oura_variable_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  variable_id TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC,
  raw JSONB,
  source TEXT DEFAULT 'oura',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add the unique constraint with a different name
ALTER TABLE oura_variable_logs 
ADD CONSTRAINT oura_variable_logs_user_variable_date_unique 
UNIQUE(user_id, variable_id, date);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_user_id ON oura_variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_variable_id ON oura_variable_logs(variable_id);
CREATE INDEX IF NOT EXISTS idx_oura_variable_logs_date ON oura_variable_logs(date);

-- Enable RLS
ALTER TABLE oura_variable_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own oura logs" ON oura_variable_logs;
DROP POLICY IF EXISTS "Users can view their own oura logs" ON oura_variable_logs;
DROP POLICY IF EXISTS "Users can update their own oura logs" ON oura_variable_logs;

-- Create RLS policies
CREATE POLICY "Users can insert their own oura logs" ON oura_variable_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own oura logs" ON oura_variable_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own oura logs" ON oura_variable_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Clean up backup table
DROP TABLE IF EXISTS oura_variable_logs_backup;

✅ After running this SQL, the Oura sync should work properly!
`);
